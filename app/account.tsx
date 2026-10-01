import { Redirect } from "expo-router";

// Account creation is handled by the real GitHub sign-in flow.
export default function AccountScreen() {
  return <Redirect href="/login" />;
}
