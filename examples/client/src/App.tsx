import { useGuacamole } from './hooks/useGuacamole';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';

export function App() {
  const { displayRef, status, error, remoteClipboard, connect, disconnect, sendClipboard } =
    useGuacamole();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <LeftPanel
        status={status}
        remoteClipboard={remoteClipboard}
        onConnect={connect}
        onDisconnect={disconnect}
        onSendClipboard={sendClipboard}
      />
      <RightPanel displayRef={displayRef} status={status} error={error} />
    </div>
  );
}
