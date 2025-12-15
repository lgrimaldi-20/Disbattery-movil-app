import React, { useState } from "react";
import { SafeAreaView } from "react-native";
import LoginPage from "../components/LoginPage";
import Dashboard from "../components/Dashboard";

export default function Index() {
  const [user, setUser] = useState<string | null>(null);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {user ? (
        <Dashboard user={user} onLogout={() => setUser(null)} />
      ) : (
        <LoginPage onLogin={setUser} />
      )}
    </SafeAreaView>
  );
}
