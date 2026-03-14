import * as React from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Button } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [userInfo, setUserInfo] = React.useState(null);

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  console.log("GOOGLE CLIENT ID =", googleClientId);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
    scopes: ["openid", "profile", "email"],
  });

  React.useEffect(() => {
    console.log("AUTH RESPONSE =", response);

    if (response?.type === "success") {
      const idToken =
        response.authentication?.idToken ||
        response.params?.id_token;

      if (idToken) {
        postIdTokenToBackend(idToken);
      } else {
        console.error("No id_token found in response");
      }
    }
  }, [response]);

  const postIdTokenToBackend = async (idToken) => {
    try {
      const resp = await fetch("http://localhost:3000/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id_token: idToken }),
      });

      const data = await resp.json();
      console.log("Backend response:", data);

      if (!resp.ok) {
        console.error("Backend returned error:", data);
        return;
      }

      if (data.user) {
        setUserInfo(data.user);
        await AsyncStorage.setItem("@user", JSON.stringify(data.user));
      }

      if (data.token) {
        await AsyncStorage.setItem("@app_token", data.token);
      }
    } catch (e) {
      console.error("Failed to POST id_token to backend", e);
    }
  };

  const clearStorage = async () => {
    try {
      await AsyncStorage.removeItem("@user");
      await AsyncStorage.removeItem("@app_token");
      setUserInfo(null);
    } catch (e) {
      console.error("Failed to clear storage", e);
    }
  };

  return (
    <View style={styles.container}>
      <Text>{userInfo ? `Signed in: ${userInfo.name}` : "Not signed in"}</Text>
      <Text style={styles.jsonText}>
        {userInfo ? JSON.stringify(userInfo, null, 2) : ""}
      </Text>

      <Button
        title="Sign in with Google"
        disabled={!request}
        onPress={() => promptAsync()}
      />

      <View style={styles.spacer} />

      <Button
        title="Sign out / Clear local storage"
        onPress={clearStorage}
      />

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  spacer: {
    height: 12,
  },
  jsonText: {
    marginVertical: 12,
    textAlign: "center",
  },
});