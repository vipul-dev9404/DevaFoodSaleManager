// WelcomeScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";

// Logo
const LOGO = require("../assets/Logo.png");

export default function WelcomeScreen({ navigation }) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    try {
      // Read stored session tokens
      const access_token = await EncryptedStorage.getItem("access_token");
      const refresh_token = await EncryptedStorage.getItem("refresh_token");

      console.log("🔐 Stored Tokens:", { access_token, refresh_token });

      if (access_token && refresh_token) {
        // Restore Supabase session in v1
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (!error) {
          console.log("▶ Session Restored!");
          navigation.replace("OwnerDashboard");
          return;
        } else {
          console.log("Session restore failed:", error);
        }
      }

      // Branch Head Auto-Login
      const savedBranch = await AsyncStorage.getItem("selected_branch");
      if (savedBranch) {
        const branch = JSON.parse(savedBranch);
        navigation.replace("BranchHome", { branchId: branch.id });
        return;
      }
    } catch (err) {
      console.log("Initialization error:", err);
    }

    // Nothing found → show welcome screen
    setChecking(false);
  }

  if (checking) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator size="large" color="#ff8c42" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Image source={LOGO} style={styles.logo} />

      <Text style={styles.title}>Deva Foods</Text>
      <Text style={styles.subtitle}>A Smart Sales Recorder for Deva Foods</Text>

      <TouchableOpacity
        style={styles.ownerBtn}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.btnText}>Owner Login</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.branchBtn}
        onPress={() => navigation.navigate("SelectBranch")}
      >
        <Text style={styles.btnText}>Branch Head</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>{"<Developed with ❤️ by VIP's>"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff8ee",
  },
  loadingText: { marginTop: 10, fontSize: 16, color: "#444" },

  root: {
    flex: 1,
    backgroundColor: "#fff8ee",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  logo: {
    width: 140,
    height: 140,
    borderRadius: 20,
    marginBottom: 20,
    backgroundColor: "#f3e0c9",
  },

  title: { fontSize: 32, fontWeight: "900", marginBottom: 5, color: "#3d2c2c" },
  subtitle: { fontSize: 16, color: "#6b4f4f", marginBottom: 50 },

  ownerBtn: {
    backgroundColor: "#3d2c2c",
    paddingVertical: 14,
    borderRadius: 14,
    width: "80%",
    marginBottom: 20,
  },
  branchBtn: {
    backgroundColor: "#ff8c42",
    paddingVertical: 14,
    borderRadius: 14,
    width: "80%",
  },

  btnText: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
  },

  footer: {
    position: "absolute",
    bottom: 20,
    color: "#555",
    fontSize: 14,
    fontStyle: "italic",
  },
});
