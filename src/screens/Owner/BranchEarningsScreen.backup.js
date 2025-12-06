// src/screens/BranchEarningsScreen.js

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabaseClient";
import XLSX from "xlsx";
import RNFS from "react-native-fs";
import Share from "react-native-share";

export default function BranchEarningsScreen() {
  const [exporting, setExporting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  
  // Initialize with today's date
  const getTodayString = () => {
    const date = new Date();
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEarnings();
  }, [startDate, endDate]);

  async function fetchEarnings() {
    setLoading(true);

    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("sales")
      .select(`
        branch_id,
        quantity,
        price_at_sale,
        branches(name),
        products(name)
      `)
      .gte("created_at", startDateTime.toISOString())
      .lte("created_at", endDateTime.toISOString());

    if (error) {
      console.log("Earnings error:", error);
      setLoading(false);
      return;
    }

    const summaryMap = {};

    (data || []).forEach((row) => {
      const bId = row.branch_id;
      const bName = row.branches?.name || "Unknown";
      const pName = row.products?.name || "Unknown";
      const saleQty = row.quantity || 0;
      const salePrice = row.price_at_sale || 0;

      if (!summaryMap[bId]) {
        summaryMap[bId] = {
          branchName: bName,
          total: 0,
          products: {},
        };
      }

      if (!summaryMap[bId].products[pName]) {
        summaryMap[bId].products[pName] = {
          productName: pName,
          qty: 0,
          earning: 0,
        };
      }

      summaryMap[bId].products[pName].qty += saleQty;
      summaryMap[bId].products[pName].earning += saleQty * salePrice;
      summaryMap[bId].total += saleQty * salePrice;
    });

    const final = Object.values(summaryMap).map((entry) => ({
      ...entry,
      products: Object.values(entry.products),
    }));

    setSummary(final);
    setLoading(false);
  }

  function openDatePicker() {
    setStartDateInput(startDate);
    setEndDateInput(endDate);
    setShowDatePicker(true);
  }

  function applyDateRange() {
    if (!startDateInput || !endDateInput) {
      Alert.alert("Error", "Please enter both start and end dates");
      return;
    }

    const start = new Date(startDateInput);
    const end = new Date(endDateInput);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert("Error", "Invalid date format. Use YYYY-MM-DD");
      return;
    }

    if (start > end) {
      Alert.alert("Error", "Start date must be before end date");
      return;
    }

    setStartDate(startDateInput);
    setEndDate(endDateInput);
    setShowDatePicker(false);
  }

  async function exportToExcel() {
    if (summary.length === 0) {
      Alert.alert("No Data", "No sales data available to export");
      return;
    }

    setExporting(true);

    try {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      // Fetch detailed sales data for the period
      const { data: salesData, error } = await supabase
        .from("sales")
        .select(`
          id,
          created_at,
          quantity,
          price_at_sale,
          branches ( id, name, code ),
          products ( id, name )
        `)
        .gte("created_at", startDateTime.toISOString())
        .lte("created_at", endDateTime.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        Alert.alert("Error", "Failed to fetch sales data");
        setExporting(false);
        return;
      }

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Branch Summary
      const summaryData = summary.map((branch) => {
        const branchRow = {
          "Branch": branch.branchName,
          "Total Revenue": `₹${branch.total}`,
          "Products Sold": branch.products.length,
        };
        return branchRow;
      });

      const ws1 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, "Branch Summary");

      // Sheet 2: Product Details per Branch
      const detailedData = [];
      summary.forEach((branch) => {
        branch.products.forEach((product) => {
          detailedData.push({
            "Branch": branch.branchName,
            "Product": product.productName,
            "Quantity Sold": product.qty,
            "Revenue": `₹${product.earning}`,
          });
        });
      });

      const ws2 = XLSX.utils.json_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(wb, ws2, "Product Details");

      // Sheet 3: All Transactions
      const transactionData = (salesData || []).map((sale) => ({
        "Date & Time": new Date(sale.created_at).toLocaleString(),
        "Branch": sale.branches?.name || "N/A",
        "Product": sale.products?.name || "N/A",
        "Quantity": sale.quantity,
        "Price": sale.price_at_sale || 0,
        "Total": (sale.quantity * (sale.price_at_sale || 0)).toFixed(2),
      }));

      const ws3 = XLSX.utils.json_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(wb, ws3, "All Transactions");

      // Write to file
      const wbout = XLSX.write(wb, { type: "binary", bookType: "xlsx" });

      const fileName = `Branch_Earnings_${startDate}_to_${endDate}.xlsx`;
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
        title: "Branch Earnings Report",
        message: `Branch earnings report from ${startDate} to ${endDate}`,
        url: `file://${filePath}`,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      Alert.alert("Success", `Report saved to Downloads:\n${fileName}`);

    } catch (error) {
      console.log("Excel export error:", error);
      Alert.alert("Error", `Failed to generate Excel report: ${error.message || error}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Branch Earnings</Text>
        
        <TouchableOpacity
          style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
          onPress={exportToExcel}
          disabled={exporting || summary.length === 0}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.exportIcon}>📥</Text>
              <Text style={styles.exportText}>Excel</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* DATE RANGE SELECTOR */}
      <TouchableOpacity style={styles.dateRangeButton} onPress={openDatePicker}>
        <Text style={styles.dateRangeIcon}>📅</Text>
        <Text style={styles.dateRangeText}>
          {startDate} to {endDate}
        </Text>
      </TouchableOpacity>

      {/* DATE PICKER MODAL */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date Range</Text>

            <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.dateInput}
              value={startDateInput}
              onChangeText={setStartDateInput}
              placeholder="2024-01-01"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.dateInput}
              value={endDateInput}
              onChangeText={setEndDateInput}
              placeholder="2024-12-31"
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.applyButton]}
                onPress={applyDateRange}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LIST */}
      <ScrollView style={{ marginTop: 20 }}>
        {/* EMPTY FALLBACK */}
        {summary.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Sales Found</Text>
            <Text style={styles.emptySub}>
              No records available for this date range.
            </Text>
          </View>
        )}

        {/* BRANCH SUMMARY CARDS */}
        {summary.map((branch, index) => (
          <View style={styles.card} key={index}>
            <Text style={styles.branchName}>{branch.branchName}</Text>

            {branch.products.map((item) => (
              <View style={styles.row} key={item.productName}>
                <Text style={styles.pName}>{item.productName}</Text>
                <Text style={styles.pQty}>{item.qty}</Text>
                <Text style={styles.pEarn}>₹{item.earning}</Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>₹{branch.total}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}



/* ---------- UI STYLES ---------- */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff8ee", padding: 20 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  heading: {
    fontSize: 26,
    fontWeight: "900",
    color: "#3d2c2c",
  },

  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },

  exportButtonDisabled: {
    opacity: 0.6,
  },

  exportIcon: {
    fontSize: 18,
  },

  exportText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  dateRangeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dateRangeIcon: { fontSize: 20, marginRight: 8 },
  dateRangeText: { fontSize: 15, fontWeight: "600", color: "#3d2c2c" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3d2c2c",
    marginBottom: 20,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3d2c2c",
    marginBottom: 8,
    marginTop: 12,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  applyButton: {
    backgroundColor: "#4CAF50",
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },

  emptyBox: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3d2c2c",
  },
  emptySub: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  branchName: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
    color: "#3d2c2c",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  pName: { width: "40%" },
  pQty: { width: "20%", textAlign: "center" },
  pEarn: { width: "30%", textAlign: "right", fontWeight: "700" },

  totalRow: {
    borderTopWidth: 1,
    borderColor: "#ccc",
    paddingTop: 8,
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { fontWeight: "800" },
  totalValue: { fontWeight: "900", color: "#ff8c42" },
});
