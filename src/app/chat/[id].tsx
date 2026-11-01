import { useLocalSearchParams } from 'expo-router';
import { ChatContainer } from '../../components/chat';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) return null;

  return <ChatContainer bookingId={id} />;
}
