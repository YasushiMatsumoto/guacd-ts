import { useCallback, useEffect, useRef, useState } from 'react';
import Guacamole from 'guacamole-common-js';

export type GuacStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'error';

export interface UseGuacamoleReturn {
  displayRef: (el: HTMLDivElement | null) => void;
  status: GuacStatus;
  error: string | null;
  remoteClipboard: string;
  connect: (wsUrl: string) => void;
  disconnect: () => void;
  sendClipboard: (text: string) => void;
}

export function useGuacamole(): UseGuacamoleReturn {
  const [status, setStatus] = useState<GuacStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [remoteClipboard, setRemoteClipboard] = useState('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const clientRef = useRef<Guacamole.Client | null>(null);
  const keyboardRef = useRef<Guacamole.Keyboard | null>(null);
  const mouseRef = useRef<Guacamole.Mouse | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const teardown = useCallback(() => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;

    if (keyboardRef.current) {
      keyboardRef.current.onkeydown = null;
      keyboardRef.current.onkeyup = null;
      keyboardRef.current = null;
    }
    if (mouseRef.current) {
      mouseRef.current.onmousedown = null;
      mouseRef.current.onmouseup = null;
      mouseRef.current.onmousemove = null;
      mouseRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  }, []);

  const disconnect = useCallback(() => {
    setStatus('disconnecting');
    teardown();
    setStatus('idle');
  }, [teardown]);

  const connect = useCallback(
    (wsUrl: string) => {
      teardown();
      setError(null);
      setStatus('connecting');

      // Split wsUrl so query string is passed to connect() — WebSocketTunnel
      // appends "?" + data to the base URL, so we must NOT keep query params in it.
      const qMark = wsUrl.indexOf('?');
      const baseUrl = qMark >= 0 ? wsUrl.slice(0, qMark) : wsUrl;
      const queryString = qMark >= 0 ? wsUrl.slice(qMark + 1) : '';

      const tunnel = new Guacamole.WebSocketTunnel(baseUrl);
      const client = new Guacamole.Client(tunnel);
      clientRef.current = client;

      const display = client.getDisplay();
      const displayEl = display.getElement();

      // Contain-mode scale: fit display inside container without clipping.
      // Uses both width and height so the canvas fills top-to-bottom as well.
      const applyScale = () => {
        if (!containerRef.current) return;
        const { clientWidth, clientHeight } = containerRef.current;
        const dw = display.getWidth();
        const dh = display.getHeight();
        if (clientWidth > 0 && clientHeight > 0 && dw > 0 && dh > 0) {
          display.scale(Math.min(clientWidth / dw, clientHeight / dh));
        }
      };

      // guacamole-common-js fires onresize inside scheduleTask after the `size`
      // instruction is processed — i.e., exactly when the display dimensions are known.
      display.onresize = applyScale;

      client.onstatechange = (state: number) => {
        switch (state) {
          case 1: // CONNECTING
          case 2: // WAITING
            setStatus('connecting');
            break;
          case 3: // CONNECTED
            setStatus('connected');
            applyScale();
            break;
          case 4: // DISCONNECTING
            setStatus('disconnecting');
            break;
          case 5: // DISCONNECTED
            setStatus('idle');
            break;
        }
      };

      client.onclipboard = (stream: Guacamole.InputStream, mimetype: string) => {
        if (/^text\//.test(mimetype)) {
          const reader = new Guacamole.StringReader(stream);
          let data = '';
          reader.ontext = (text: string) => {
            data += text;
          };
          reader.onend = () => {
            setRemoteClipboard(data);
          };
        }
      };

      client.onerror = (err: Guacamole.Status) => {
        setError(`Connection error: ${err.message} (code ${String(err.code)})`);
        setStatus('error');
        teardown();
      };

      if (containerRef.current) {
        containerRef.current.appendChild(displayEl);

        // Mouse input
        const mouse = new Guacamole.Mouse(displayEl);
        mouseRef.current = mouse;
        const sendMouse = (state: Guacamole.Mouse.State) => {
          display.showCursor(false);
          client.sendMouseState(state, true);
        };
        mouse.onmousedown = (state: Guacamole.Mouse.State) => {
          containerRef.current?.focus();
          sendMouse(state);
        };
        mouse.onmouseup = sendMouse;
        mouse.onmousemove = sendMouse;

        // Keyboard input — attach to container so sidebar inputs aren't captured
        containerRef.current.tabIndex = 0;
        containerRef.current.style.outline = 'none';
        containerRef.current.focus();
        const keyboard = new Guacamole.Keyboard(containerRef.current);
        keyboardRef.current = keyboard;
        keyboard.onkeydown = (keysym: number) => {
          client.sendKeyEvent(1, keysym);
          return true;
        };
        keyboard.onkeyup = (keysym: number) => {
          client.sendKeyEvent(0, keysym);
        };

        // ResizeObserver: send new size to guacd and re-scale when container changes
        const observer = new ResizeObserver(() => {
          if (!containerRef.current || !clientRef.current) return;
          const { clientWidth, clientHeight } = containerRef.current;
          if (clientWidth > 0 && clientHeight > 0) {
            clientRef.current.sendSize(clientWidth, clientHeight);
            applyScale();
          }
        });
        observer.observe(containerRef.current);
        resizeObserverRef.current = observer;
      }

      client.connect(queryString);
    },
    [teardown]
  );

  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  const sendClipboard = useCallback((text: string) => {
    const client = clientRef.current;
    if (!client) return;
    const stream = client.createClipboardStream('text/plain');
    const writer = new Guacamole.StringWriter(stream);
    writer.sendText(text);
    writer.sendEnd();
  }, []);

  const displayRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
  }, []);

  return { displayRef, status, error, remoteClipboard, connect, disconnect, sendClipboard };
}
