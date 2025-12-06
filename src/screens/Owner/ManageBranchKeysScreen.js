// src/screens/Owner/ManageBranchKeysScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabaseClient";

export default function ManageBranchKeysScreen({ navigation }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  async function fetchBranches() {
    setLoading(true);
    const { data, error } = await supabase
      .from("branches")
      .select("id, name, code, access_key")
      .order("code", { ascending: true });

    if (error) {
      console.log("Fetch branches error:", error);
      Alert.alert("Error", "Failed to load branches");
    } else {
      setBranches(data || []);
    }
    setLoading(false);
  }

  async function handleRegenerateKey(branch) {
    Alert.alert(
      "Regenerate Access Key",
      `Generate new access key for ${branch.name}?\n\nOld key will stop working immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "destructive",
          onPress: async () => {
            const newKey = generateAccessKey();
            
            const { error } = await supabase
              .from("branches")
              .update({ access_key: newKey })
              .eq("id", branch.id);

            if (error) {
              Alert.alert("Error", "Failed to regenerate key");
            } else {
              Alert.alert(
                "Success",
                `New Access Key: ${newKey}\n\nShare this with your branch head.`
              );
              fetchBranches();
            }
          },
        },
      ]
    );
  }

  function generateAccessKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let key = '';
    for (let i = 0; i < 8; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  async function handleShareKey(branch) {
    try {
      await Share.share({
        message: `Branch: ${branch.name} (${branch.code})\nAccess Key: ${branch.access_key}\n\nUse this key to access the branch in Deva Foods Sales Manager app.`,
      });
    } catch (error) {
      console.log("Share error:", error);
    }
  }

  function renderBranch({ item }) {
    return (
      <View style={styles.branchCard}>
        <View style={styles.branchHeader}>
          <Text style={styles.branchName}>{item.name}</Text>
          <Text style={styles.branchCode}>{item.code}</Text>
        </View>
        
        <View style={styles.keyContainer}>
          <Text style={styles.keyLabel}>Access Key:</Text>
          <Text style={styles.keyValue}>{item.access_key}</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.shareButton]}
            onPress={() => handleShareKey(item)}
          >
            <Text style={styles.buttonText}>📤 Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.regenerateButton]}
            onPress={() => handleRegenerateKey(item)}
          >
            <Text style={styles.buttonText}>🔄 Regenerate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Branch Access Keys</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#d4a574" style={{ marginTop: 50 }} />
      ) : branches.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No branches created yet</Text>
        </View>
      ) : (
        <FlatList
          data={branches}
          renderItem={renderBranch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff8ee",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    fontSize: 16,
    color: "#d4a574",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2f2a27",
  },
  list: {
    padding: 16,
  },
  branchCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  branchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  branchName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2f2a27",
    flex: 1,
  },
  branchCode: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  keyContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  keyLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  keyValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2f2a27",
    letterSpacing: 2,
    fontFamily: "monospace",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  shareButton: {
    backgroundColor: "#4CAF50",
  },
  regenerateButton: {
    backgroundColor: "#FF9800",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
