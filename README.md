# DevaFood Sales Manager

A React Native application for managing multiple branch sales, inventory, and earnings tracking for food businesses.

## 📱 Features

### Owner Features
- **Dashboard**: Real-time view of today's earnings and product sales
- **Branch Management**: Create and manage multiple branches
- **Product Management**: Add, edit, and manage products with images
- **Branch-Specific Pricing**: Set different prices for products per branch
- **Key-Based Authorization**: Secure branch access with unique 8-character keys
- **Earnings Analytics**: 
  - View sales by Daily/Weekly/Monthly periods
  - Export Excel reports with custom date ranges
  - Multi-sheet reports (Branch Summary, Product Details, All Transactions)
- **Branch Keys Management**: View, share, and regenerate access keys

### Branch Head Features
- **Quick Sales Entry**: Tap products to record sales instantly
- **Sound Feedback**: Audio confirmation on successful sales (no blocking alerts)
- **Daily Counter**: Visual badges showing products sold today
- **Offline Support**: Sales queue when offline, syncs when back online
- **Branch Selection**: Secure key-based access to assigned branch

## 🛠️ Tech Stack

- **React Native**: 0.82.1 (CLI)
- **Navigation**: @react-navigation/native with native-stack
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Storage**: 
  - AsyncStorage (auth persistence)
  - EncryptedStorage (secure tokens)
- **Media**: 
  - react-native-image-picker
  - react-native-sound
  - react-native-video
- **Excel Export**: xlsx, react-native-fs, react-native-share
- **Platform**: Android SDK 35

## 📦 Installation

### Prerequisites
- Node.js >= 18
- Java JDK 17
- Android Studio
- React Native CLI

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/vipul-dev9404/DevaFoodSaleManager.git
cd DevaFoodSaleManager
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Supabase**
   
Create `src/lib/supabaseClient.js`:
```javascript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

4. **Database Schema**

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Branches table
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  access_key TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Branch Products (branch-specific pricing)
CREATE TABLE branch_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(branch_id, product_id)
);

-- Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price_at_sale NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_sales_branch ON sales(branch_id);
CREATE INDEX idx_sales_product ON sales(product_id);
CREATE INDEX idx_sales_created ON sales(created_at);
CREATE INDEX idx_branches_access_key ON branches(access_key);
```

5. **Android Setup**

```bash
cd android
./gradlew clean
cd ..
```

6. **Run the app**

```bash
# Start Metro bundler
npm start

# In another terminal, run Android
npx react-native run-android
```

## 🔑 Build Release APK/AAB

### Generate Release APK
```bash
cd android
./gradlew assembleRelease
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

### Generate Release AAB (for Play Store)
```bash
cd android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Keystore Configuration
The keystore is already configured in `android/app/build.gradle`:
- Location: `android/app/devafood-release-key.keystore`
- Credentials stored in: `android/credentials/`

## 📊 Usage

### Owner Login
1. Login with owner credentials
2. Access full dashboard and management tools

### Branch Head Access
1. Select "Branch Head" from welcome screen
2. Choose your branch
3. Enter 8-character access key (get from owner)
4. Start recording sales

### Recording Sales
- Tap product card to increment quantity
- Sound plays on successful sale
- Badge shows daily sales count
- No blocking alerts for quick entry

### Exporting Reports
1. Navigate to "Earnings" from Owner Dashboard
2. View Daily/Weekly/Monthly tabs
3. Click Excel button for custom date range
4. Enter dates (YYYY-MM-DD format)
5. Click Export to generate and share Excel file

## 🗂️ Project Structure

```
DevafoodSalesManager/
├── src/
│   ├── Auth/
│   │   └── LoginScreen.js
│   ├── screens/
│   │   ├── Owner/
│   │   │   ├── AddBranchScreen.js
│   │   │   ├── AddProductScreen.js
│   │   │   ├── BranchEarningsScreen.js
│   │   │   ├── BranchProductManagerScreen.js
│   │   │   ├── EditProductScreen.js
│   │   │   ├── ExportReportsScreen.js
│   │   │   ├── ManageBranchKeysScreen.js
│   │   │   └── ManageProductsScreen.js
│   │   ├── Branch/
│   │   │   ├── BranchHomeScreen.js
│   │   │   ├── BranchKeyVerification.js
│   │   │   └── SelectBranchScreen.js
│   │   ├── OwnerDashboard.js
│   │   └── WelcomeScreen.js
│   ├── lib/
│   │   ├── supabaseClient.js
│   │   └── offlineQueue.js
│   └── assets/
│       ├── sounds/
│       └── Logo.png
├── android/
└── ios/
```

## 🔐 Security Features

- **Encrypted Storage**: Secure token storage
- **Key-Based Auth**: Unique access keys per branch (24-hour session)
- **Server Validation**: All keys verified against Supabase
- **Session Management**: Auto-refresh tokens

## 📝 Version History

### v1.0.1 (Current)
- Added Excel export with date range picker
- Implemented key-based authorization
- Added daily sales counter with badges
- Sound-only feedback (removed blocking alerts)
- Branch-specific pricing management
- Real-time dashboard updates

## 🤝 Contributing

This is a private project. For access or collaboration, contact the repository owner.

## 📄 License

Proprietary - All rights reserved

## 👨‍💻 Author

**Vipul Dev**
- GitHub: [@vipul-dev9404](https://github.com/vipul-dev9404)

## 🐛 Known Issues

- None currently reported

## 📞 Support

For issues or questions, please create an issue in the GitHub repository.
