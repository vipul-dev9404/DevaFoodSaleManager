// src/screens/Owner/ExportReportsScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabaseClient";
import XLSX from "xlsx";
import RNFS from "react-native-fs";
import Share from "react-native-share";

export default function ExportReportsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState(null);

  // Get date ranges
  function getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: "Today" };
  }

  function getYesterdayRange() {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: "Yesterday" };
  }

  function getThisWeekRange() {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: "This Week" };
  }

  function getThisMonthRange() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: "This Month" };
  }

  function getLastMonthRange() {
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: "Last Month" };
  }

  async function fetchSalesData(startDate, endDate) {
    const { data, error } = await supabase
      .from("sales")
      .select(`
        id,
        created_at,
        quantity,
        price_at_sale,
        branches ( id, name, code ),
        products ( id, name )
      `)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: true });

    if (error) {
      console.log("Fetch sales error:", error);
      return null;
    }

    return data || [];
  }

  function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  }

  async function generateExcelReport(range) {
    setLoading(true);
    setExportType(range.label);

    try {
      const salesData = await fetchSalesData(range.start, range.end);

      if (!salesData || salesData.length === 0) {
        Alert.alert("No Data", `No sales found for ${range.label}`);
        setLoading(false);
        setExportType(null);
        return;
      }

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Detailed Transactions
      const transactionData = salesData.map((sale) => ({
        "Date & Time": formatDate(sale.created_at),
        "Branch": sale.branches?.name || "N/A",
        "Branch Code": sale.branches?.code || "N/A",
        "Product": sale.products?.name || "N/A",
        "Quantity": sale.quantity,
        "Price": sale.price_at_sale || 0,
        "Total": (sale.quantity * (sale.price_at_sale || 0)).toFixed(2),
      }));

      const ws1 = XLSX.utils.json_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(wb, ws1, "Detailed Transactions");

      // Sheet 2: Product-wise Summary
      const productSummary = {};
      salesData.forEach((sale) => {
        const productName = sale.products?.name || "Unknown";
        if (!productSummary[productName]) {
          productSummary[productName] = { quantity: 0, revenue: 0 };
        }
        productSummary[productName].quantity += sale.quantity;
        productSummary[productName].revenue += sale.quantity * (sale.price_at_sale || 0);
      });

      const productData = Object.keys(productSummary).map((product) => ({
        "Product": product,
        "Total Sold": productSummary[product].quantity,
        "Total Revenue": productSummary[product].revenue.toFixed(2),
      }));

      const ws2 = XLSX.utils.json_to_sheet(productData);
      XLSX.utils.book_append_sheet(wb, ws2, "Product Summary");

      // Sheet 3: Branch-wise Summary
      const branchSummary = {};
      salesData.forEach((sale) => {
        const branchName = sale.branches?.name || "Unknown";
        if (!branchSummary[branchName]) {
          branchSummary[branchName] = { quantity: 0, revenue: 0 };
        }
        branchSummary[branchName].quantity += sale.quantity;
        branchSummary[branchName].revenue += sale.quantity * (sale.price_at_sale || 0);
      });

      const branchData = Object.keys(branchSummary).map((branch) => ({
        "Branch": branch,
        "Total Items Sold": branchSummary[branch].quantity,
        "Total Revenue": branchSummary[branch].revenue.toFixed(2),
      }));

      const ws3 = XLSX.utils.json_to_sheet(branchData);
      XLSX.utils.book_append_sheet(wb, ws3, "Branch Summary");

      // Sheet 4: Overall Summary
      const totalRevenue = salesData.reduce(
        (sum, sale) => sum + sale.quantity * (sale.price_at_sale || 0),
        0
      );
      const totalItems = salesData.reduce((sum, sale) => sum + sale.quantity, 0);

      const summaryData = [
        { "Metric": "Total Revenue", "Value": `₹${totalRevenue.toFixed(2)}` },
        { "Metric": "Total Items Sold", "Value": totalItems },
        { "Metric": "Total Transactions", "Value": salesData.length },
        { "Metric": "Period", "Value": range.label },
        { "Metric": "Generated On", "Value": new Date().toLocaleString() },
      ];

      const ws4 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws4, "Overall Summary");

      // Write to file
      const wbout = XLSX.write(wb, { type: "binary", bookType: "xlsx" });

      const fileName = `Sales_Report_${range.label.replace(/\s/g, "_")}_${Date.now()}.xlsx`;
      const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

      // Convert binary string to buffer
      const buffer = new ArrayBuffer(wbout.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < wbout.length; i++) {
        view[i] = wbout.charCodeAt(i) & 0xff;
      }

      await RNFS.writeFile(filePath, Array.from(view), "ascii");

      // Share the file
      await Share.open({
        title: "Sales Report",
        message: `Sales report for ${range.label}`,
        url: `file://${filePath}`,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      Alert.alert("Success", `Report saved to Downloads folder:\n${fileName}`);

    } catch (error) {
      console.log("Excel generation error:", error);
      Alert.alert("Error", "Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
      setExportType(null);
    }
  }

  const reportButtons = [
    { label: "Today", range: getTodayRange },
    { label: "Yesterday", range: getYesterdayRange },
    { label: "This Week", range: getThisWeekRange },
    { label: "This Month", range: getThisMonthRange },
    { label: "Last Month", range: getLastMonthRange },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Export Reports</Text>
        <Text style={styles.subtitle}>Generate Excel reports for any period</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>📊</Text>
          <Text style={styles.infoTitle}>Excel Reports Include:</Text>
          <Text style={styles.infoText}>✓ Detailed transaction list</Text>
          <Text style={styles.infoText}>✓ Product-wise summary</Text>
          <Text style={styles.infoText}>✓ Branch-wise breakdown</Text>
          <Text style={styles.infoText}>✓ Overall statistics</Text>
        </View>

        <Text style={styles.sectionTitle}>Select Period</Text>

        {reportButtons.map((button, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.reportButton,
              loading && exportType === button.label && styles.reportButtonActive,
            ]}
            onPress={() => generateExcelReport(button.range())}
            disabled={loading}
          >
            <Text style={styles.reportButtonIcon}>📥</Text>
            <Text style={styles.reportButtonText}>{button.label}</Text>
            {loading && exportType === button.label && (
              <ActivityIndicator size="small" color="#fff" style={styles.loader} />
            )}
          </TouchableOpacity>
        ))}

        {loading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Generating Excel report...</Text>
          </View>
        )}
      </ScrollView>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  infoIcon: {
    fontSize: 32,
    textAlign: "center",
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2f2a27",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2f2a27",
    marginBottom: 12,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d4a574",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reportButtonActive: {
    backgroundColor: "#b8895a",
  },
  reportButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  reportButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  loader: {
    marginLeft: 8,
  },
  loadingOverlay: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
});
