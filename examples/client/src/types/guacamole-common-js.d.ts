declare module 'guacamole-common-js' {
  namespace Guacamole {
    class WebSocketTunnel {
      constructor(tunnelURL: string);
      onstatechange: ((state: number) => void) | null;
      onerror: ((error: Status) => void) | null;
      readonly OPEN: number;
      readonly CLOSED: number;
      readonly UNSTABLE: number;
      readonly CONNECTING: number;
    }

    class Client {
      constructor(tunnel: WebSocketTunnel);
      connect(data?: string): void;
      disconnect(): void;
      sendSize(width: number, height: number): void;
      sendKeyEvent(pressed: number, keysym: number): void;
      sendMouseState(mouseState: Mouse.State, applyDisplayScale?: boolean): void;
      getDisplay(): Display;
      createClipboardStream(mimetype: string): OutputStream;
      onstatechange: ((state: number) => void) | null;
      onerror: ((error: Status) => void) | null;
      onclipboard: ((stream: InputStream, mimetype: string) => void) | null;
    }

    namespace Client {
      const State: {
        readonly IDLE: 0;
        readonly CONNECTING: 1;
        readonly WAITING: 2;
        readonly CONNECTED: 3;
        readonly DISCONNECTING: 4;
        readonly DISCONNECTED: 5;
      };
    }

    class Display {
      getElement(): HTMLElement;
      scale(scale: number): void;
      getWidth(): number;
      getHeight(): number;
      showCursor(show: boolean): void;
      onresize: ((width: number, height: number) => void) | null;
    }

    class Keyboard {
      constructor(element: Document | HTMLElement);
      onkeydown: ((keysym: number) => boolean | void) | null;
      onkeyup: ((keysym: number) => void) | null;
    }

    namespace Mouse {
      class State {
        x: number;
        y: number;
        left: boolean;
        middle: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
      }
    }

    class Mouse {
      constructor(element: HTMLElement);
      onmousedown: ((state: Mouse.State) => void) | null;
      onmouseup: ((state: Mouse.State) => void) | null;
      onmousemove: ((state: Mouse.State) => void) | null;
    }

    class InputStream {
      onblob: ((data: string) => void) | null;
      onend: (() => void) | null;
    }

    class OutputStream {
      sendBlob(data: string): void;
      sendEnd(): void;
    }

    class StringReader {
      constructor(stream: InputStream);
      ontext: ((text: string) => void) | null;
      onend: (() => void) | null;
    }

    class StringWriter {
      constructor(stream: OutputStream);
      sendText(text: string): void;
      sendEnd(): void;
    }

    class Status {
      code: number;
      message: string;
    }
  }

  export = Guacamole;
}
