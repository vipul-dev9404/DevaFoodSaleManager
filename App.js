// /**
//  * Sample React Native App
//  * https://github.com/facebook/react-native
//  *
//  * @format
//  */
// import { NewAppScreen } from '@react-native/new-app-screen';
// import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
// import {
//   SafeAreaProvider,
//   useSafeAreaInsets,
// } from 'react-native-safe-area-context';

// function App() {
//   const isDarkMode = useColorScheme() === 'dark';

//   return (
//     <SafeAreaProvider>
//       <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
//       <AppContent />
//     </SafeAreaProvider>
//   );
// }

// function AppContent() {
//   const safeAreaInsets = useSafeAreaInsets();

//   return (
//     <View style={styles.container}>
//       <NewAppScreen
//         templateFileName="App.js"
//         safeAreaInsets={safeAreaInsets}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
// });

// export default App;


import React from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OwnerDashboard from "./src/screens/OwnerDashboard";
import ProductsManager from "./src/screens/ProductsManager";
import SelectBranchScreen from "./src/screens/Branch/SelectBranchScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import LoginScreen from "./src/Auth/LoginScreen";
//import ManageProducts from "./src/screens/Owner/ManageProduct";
import ManageProductsScreen from "./src/screens/Owner/ManageProductsScreen";
import AddProductScreen from "./src/screens/Owner/AddProductScreen";
import EditProductScreen from "./src/screens/Owner/EditProductScreen";
import BranchHomeScreen from "./src/screens/Branch/BranchHomeScreen";
import BranchKeyVerification from "./src/screens/Branch/BranchKeyVerification";
import DebugSupabaseScreen from "./src/DebugSupabaseScreen";
import BranchEarningsScreen from "./src/screens/Owner/BranchEarningsScreen";
import AddBranchScreen from "./src/screens/Owner/AddBranchScreen";
import BranchProductManagerScreen from "./src/screens/Owner/BranchProductManagerScreen";
import ManageBranchKeysScreen from "./src/screens/Owner/ManageBranchKeysScreen";
import ExportReportsScreen from "./src/screens/Owner/ExportReportsScreen";

const Stack = createNativeStackNavigator();

export default function App() {

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={false}
      />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Welcome">
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SelectBranch"
          component={SelectBranchScreen}
          options={{ title: "Select Branch" }}
        />
        <Stack.Screen
          name="BranchKeyVerification"
          component={BranchKeyVerification}
          options={{ title: "Verify Access" }}
        />
        <Stack.Screen
          name="OwnerDashboard"
          component={OwnerDashboard}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ManageProducts"
          component={ManageProductsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProductsManager"
          component={ProductsManager}
          options={{ title: "Products" }}
        />

        <Stack.Screen
          name="AddProduct"
          component={AddProductScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EditProduct"
          component={EditProductScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BranchHome"
          component={BranchHomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DebugSupabase"
          component={DebugSupabaseScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BranchEarnings"
          component={BranchEarningsScreen}
          options={{ title: "Branch Earnings", headerShown: false }}
        />
        <Stack.Screen
          name="AddBranch"
          component={AddBranchScreen}
          options={{ title: "Add Branch", headerShown: false }}
        />
        <Stack.Screen
          name="BranchProductManager"
          component={BranchProductManagerScreen}
          options={{ title: "Branch Product Manager", headerShown: false }}
        />
        <Stack.Screen
          name="ManageBranchKeys"
          component={ManageBranchKeysScreen}
          options={{ title: "Manage Branch Keys", headerShown: false }}
        />
        <Stack.Screen
          name="ExportReports"
          component={ExportReportsScreen}
          options={{ title: "Export Reports", headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </>
  );
}
