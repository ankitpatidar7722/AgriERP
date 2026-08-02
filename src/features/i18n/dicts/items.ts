import type { Lang } from "../config";

/**
 * Items cluster strings: items list/form, item groups, item sub-groups, and the
 * dynamic-field renderer. Merged into the master `dict` by dictionary.ts. Keys
 * are namespaced `item.*` / `grp.*` / `sub.*` / `field.*`.
 */
export const items: Record<string, Record<Lang, string>> = {
  /* -------------------------------- items --------------------------------- */
  "item.title": { en: "Items", hi: "आइटम", hg: "Items" },
  "item.desc": {
    en: "Everything the shop stocks, with live stock from batches.",
    hi: "वह सब कुछ जो दुकान में रखा है, बैचों से लाइव स्टॉक के साथ।",
    hg: "Shop me jo bhi rakha hai, batches se live stock ke saath.",
  },
  "item.loadingGroupFields": {
    en: "Loading this group's fields...",
    hi: "इस समूह के फ़ील्ड लोड हो रहे हैं...",
    hg: "Is group ke fields load ho rahe hain...",
  },
  "item.selectGroup": { en: "Select group", hi: "समूह चुनें", hg: "Group choose karein" },
  "item.newItem": { en: "New item", hi: "नया आइटम", hg: "Naya item" },
  "item.search": {
    en: "Search name, code, technical name or barcode...",
    hi: "नाम, कोड, तकनीकी नाम या बारकोड खोजें...",
    hg: "Naam, code, technical name ya barcode dhundo...",
  },
  "item.empty": { en: "No items yet.", hi: "अभी कोई आइटम नहीं।", hg: "Abhi koi item nahi." },
  "item.allSubGroups": { en: "All sub groups", hi: "सभी उप-समूह", hg: "Sab sub groups" },
  "item.allCompanies": { en: "All companies", hi: "सभी कंपनियाँ", hg: "Sab companies" },
  "item.allStock": { en: "All stock", hi: "सभी स्टॉक", hg: "Sab stock" },
  "item.inStock": { en: "In stock", hi: "स्टॉक में", hg: "Stock me" },
  "item.lowStock": { en: "Low stock", hi: "कम स्टॉक", hg: "Kam stock" },
  "item.outOfStock": { en: "Out of stock", hi: "स्टॉक खत्म", hg: "Stock khatam" },
  "item.overStock": { en: "Over stock", hi: "अधिक स्टॉक", hg: "Zyada stock" },
  "item.editTitle": { en: "Edit item", hi: "आइटम संपादित करें", hg: "Item edit karo" },
  "item.formDesc": {
    en: "The item code is allocated automatically.",
    hi: "आइटम कोड अपने आप बन जाता है।",
    hg: "Item code apne aap ban jaata hai.",
  },

  "item.sectionGroup": { en: "Item group", hi: "आइटम समूह", hg: "Item group" },
  "item.group": { en: "Group", hi: "समूह", hg: "Group" },
  "item.groupHintFixed": {
    en: "Fixed once the item exists.",
    hi: "आइटम बनने के बाद तय हो जाता है।",
    hg: "Item banne ke baad fix ho jaata hai.",
  },
  "item.groupHintNew": {
    en: "Taken from the group selected above the list.",
    hi: "सूची के ऊपर चुने गए समूह से लिया गया।",
    hg: "List ke upar select kiye gaye group se aata hai.",
  },

  "item.sectionBasicDetails": { en: "Basic details", hi: "मूल विवरण", hg: "Basic details" },
  "item.itemName": { en: "Item name", hi: "आइटम का नाम", hg: "Item ka naam" },
  "item.shortName": { en: "Short name", hi: "संक्षिप्त नाम", hg: "Short naam" },
  "item.shortNameHint": {
    en: "Printed on the invoice line.",
    hi: "यह इनवॉइस लाइन पर प्रिंट होता है।",
    hg: "Invoice line par print hota hai.",
  },
  "item.technicalName": { en: "Technical name", hi: "तकनीकी नाम", hg: "Technical naam" },
  "item.technicalNameHint": {
    en: "Active ingredient, e.g. Imidacloprid 17.8% SL.",
    hi: "सक्रिय तत्व, जैसे Imidacloprid 17.8% SL।",
    hg: "Active ingredient, jaise Imidacloprid 17.8% SL.",
  },
  "item.brand": { en: "Brand", hi: "ब्रांड", hg: "Brand" },
  "item.subGroup": { en: "Sub group", hi: "उप-समूह", hg: "Sub group" },
  "item.selectSubGroup": { en: "Select sub group", hi: "उप-समूह चुनें", hg: "Sub group choose karein" },
  "item.company": { en: "Company", hi: "कंपनी", hg: "Company" },
  "item.selectCompany": { en: "Select company", hi: "कंपनी चुनें", hg: "Company choose karein" },
  "item.notSet": { en: "Not set", hi: "तय नहीं", hg: "Set nahi" },
  "item.packSize": { en: "Pack size", hi: "पैक साइज़", hg: "Pack size" },
  "item.packUnit": { en: "Pack unit", hi: "पैक इकाई", hg: "Pack unit" },
  "item.unitPlaceholder": { en: "Unit", hi: "इकाई", hg: "Unit" },
  "item.purchaseUnit": { en: "Purchase unit", hi: "खरीद इकाई", hg: "Purchase unit" },
  "item.stockUnit": { en: "Stock unit", hi: "स्टॉक इकाई", hg: "Stock unit" },
  "item.sellingUnit": { en: "Selling unit", hi: "बिक्री इकाई", hg: "Bikri unit" },

  "item.sectionPricingTax": { en: "Pricing & tax", hi: "मूल्य और टैक्स", hg: "Price aur tax" },
  "item.hsnCode": { en: "HSN code", hi: "HSN कोड", hg: "HSN code" },
  "item.selectHsn": { en: "Select HSN", hi: "HSN चुनें", hg: "HSN choose karein" },
  "item.gstRate": { en: "GST rate", hi: "GST दर", hg: "GST rate" },
  "item.selectGstRate": { en: "Select rate", hi: "दर चुनें", hg: "Rate choose karein" },
  "item.mrp": { en: "MRP", hi: "MRP", hg: "MRP" },
  "item.purchaseRate": { en: "Purchase rate", hi: "खरीद मूल्य", hg: "Purchase rate" },
  "item.purchaseRateHint": {
    en: "Updated automatically when a purchase is posted.",
    hi: "खरीद पोस्ट होने पर अपने आप अपडेट हो जाता है।",
    hg: "Purchase post hone par apne aap update ho jaata hai.",
  },
  "item.sellingRate": { en: "Selling rate", hi: "बिक्री मूल्य", hg: "Bikri rate" },
  "item.minSellingRate": { en: "Minimum selling rate", hi: "न्यूनतम बिक्री मूल्य", hg: "Minimum bikri rate" },
  "item.minSellingRateHint": {
    en: "Floor price; overriding it needs a permission.",
    hi: "न्यूनतम मूल्य; इसे बदलने के लिए अनुमति चाहिए।",
    hg: "Floor price; isse badalne ke liye permission chahiye.",
  },
  "item.wholesaleRate": { en: "Wholesale rate", hi: "थोक मूल्य", hg: "Thok rate" },
  "item.dealerRate": { en: "Dealer rate", hi: "डीलर मूल्य", hg: "Dealer rate" },

  "item.stock": { en: "Stock", hi: "स्टॉक", hg: "Stock" },
  "item.minStock": { en: "Minimum stock", hi: "न्यूनतम स्टॉक", hg: "Minimum stock" },
  "item.minStockHint": {
    en: "Triggers the low-stock alert.",
    hi: "इससे कम-स्टॉक अलर्ट चालू होता है।",
    hg: "Isse low-stock alert chalu hota hai.",
  },
  "item.maxStock": { en: "Maximum stock", hi: "अधिकतम स्टॉक", hg: "Maximum stock" },
  "item.reorderLevel": { en: "Reorder level", hi: "पुनः ऑर्डर स्तर", hg: "Reorder level" },

  "item.batchTracking": { en: "Batch tracking", hi: "बैच ट्रैकिंग", hg: "Batch tracking" },
  "item.batchTrackingDesc": {
    en: "Each consignment keeps its own batch number and cost.",
    hi: "हर खेप का अपना बैच नंबर और लागत होती है।",
    hg: "Har consignment ka apna batch number aur cost hota hai.",
  },
  "item.expiryTracking": { en: "Expiry tracking", hi: "एक्सपायरी ट्रैकिंग", hg: "Expiry tracking" },
  "item.expiryTrackingDesc": {
    en: "Drives FEFO picking and the near-expiry report.",
    hi: "यह FEFO पिकिंग और नियर-एक्सपायरी रिपोर्ट चलाता है।",
    hg: "Ye FEFO picking aur near-expiry report chalata hai.",
  },
  "item.allowNegativeStock": { en: "Allow negative stock", hi: "नेगेटिव स्टॉक की अनुमति दें", hg: "Negative stock allow karein" },
  "item.allowNegativeStockDesc": {
    en: "Off by design - selling stock you do not have corrupts valuation.",
    hi: "डिज़ाइन के अनुसार बंद रहता है - जो स्टॉक है ही नहीं उसे बेचने से वैल्यूएशन बिगड़ जाती है।",
    hg: "Design se off rehta hai - jo stock hai hi nahi use bechne se valuation bigad jaati hai.",
  },

  "item.batchesInStock": { en: "Batches in stock", hi: "स्टॉक में बैच", hg: "Stock me batches" },
  "item.noExpiry": { en: "no expiry", hi: "एक्सपायरी नहीं", hg: "expiry nahi" },
  "item.expPrefix": { en: "exp", hi: "एक्सपायरी", hg: "exp" },

  "item.deleteTitle": { en: "Delete item?", hi: "आइटम हटाएँ?", hg: "Item delete karein?" },
  "item.deleteDesc": {
    en: "will be hidden from lists. An item still holding stock cannot be deleted - adjust the stock to zero first, or set it inactive.",
    hi: "सूची से छिप जाएगा। जिस आइटम में अभी भी स्टॉक है उसे हटाया नहीं जा सकता - पहले स्टॉक को शून्य करें, या उसे निष्क्रिय कर दें।",
    hg: "list se chhup jayega. Jis item me abhi bhi stock hai use delete nahi kar sakte - pehle stock zero karo, ya use inactive kar do.",
  },

  "item.fieldsNeedAttention": {
    en: "fields need attention.",
    hi: "फ़ील्ड पर ध्यान देना ज़रूरी है।",
    hg: "fields par dhyan dena zaroori hai.",
  },
  "item.checkHighlightedField": {
    en: "Please check the highlighted field.",
    hi: "कृपया हाइलाइट किए गए फ़ील्ड को जांचें।",
    hg: "Highlight kiye gaye field ko check karein.",
  },
  "item.saveFailed": {
    en: "Could not save. Please try again.",
    hi: "सहेजा नहीं जा सका। कृपया फिर से प्रयास करें।",
    hg: "Save nahi ho paaya. Phir se try karein.",
  },

  "item.code": { en: "Code", hi: "कोड", hg: "Code" },
  "item.colItem": { en: "Item", hi: "आइटम", hg: "Item" },
  "item.colSelling": { en: "Selling", hi: "बिक्री", hg: "Bikri" },
  "item.colGst": { en: "GST", hi: "GST", hg: "GST" },
  "item.colStockStatus": { en: "Stock status", hi: "स्टॉक स्थिति", hg: "Stock status" },

  /* ----------------------------- item groups ------------------------------ */
  "grp.title": { en: "Item groups", hi: "आइटम समूह", hg: "Item groups" },
  "grp.desc": {
    en: "Each group decides what the item form asks for, and carries its own code series.",
    hi: "हर समूह तय करता है कि फ़ॉर्म में क्या पूछा जाएगा, और उसकी अपनी कोड सीरीज़ होती है।",
    hg: "Har group decide karta hai ki form me kya poochha jayega, aur uski apni code series hoti hai.",
  },
  "grp.subGroupsLabel": { en: "sub group(s)", hi: "उप-समूह", hg: "sub group(s)" },
  "grp.itemsLabel": { en: "item(s)", hi: "आइटम", hg: "item(s)" },
  "grp.fieldsOnForm": { en: "Fields on this form", hi: "इस फ़ॉर्म के फ़ील्ड", hg: "Is form ke fields" },
  "grp.loadingFields": { en: "Loading fields...", hi: "फ़ील्ड लोड हो रहे हैं...", hg: "Fields load ho rahe hain..." },
  "grp.onlyOnThisForm": { en: "Only on this form", hi: "केवल इसी फ़ॉर्म पर", hg: "Sirf isi form par" },
  "grp.none": { en: "None", hi: "कोई नहीं", hg: "Koi nahi" },
  "grp.sharedWithEveryGroup": { en: "Shared with every group", hi: "हर समूह में साझा", hg: "Har group me shared" },
  "grp.sharedDesc": {
    en: "Rates, GST, stock levels - stored in their own typed columns, because billing and FEFO read them directly.",
    hi: "दर, GST, स्टॉक स्तर - अपने खुद के कॉलम में सहेजे जाते हैं, क्योंकि बिलिंग और FEFO इन्हें सीधे पढ़ते हैं।",
    hg: "Rate, GST, stock levels - apne alag columns me save hote hain, kyunki billing aur FEFO inhe seedha padhte hain.",
  },

  /* --------------------------- item sub groups ----------------------------- */
  "sub.title": { en: "ItemSubGroups", hi: "आइटम उप-समूह", hg: "Item Sub Groups" },
  "sub.desc": {
    en: "How items are grouped on screens and in stock reports.",
    hi: "स्क्रीन और स्टॉक रिपोर्ट में आइटम कैसे समूहित होते हैं।",
    hg: "Screen aur stock report me items kaise group hote hain.",
  },
  "sub.newSubGroup": { en: "New itemSubGroup", hi: "नया आइटम उप-समूह", hg: "Naya item sub group" },
  "sub.code": { en: "Code", hi: "कोड", hg: "Code" },
  "sub.subGroup": { en: "Sub group", hi: "उप-समूह", hg: "Sub group" },
  "sub.under": { en: "under", hi: "अंतर्गत", hg: "ke andar" },
  "sub.parent": { en: "Parent", hi: "पैरेंट", hg: "Parent" },
  "sub.items": { en: "Items", hi: "आइटम", hg: "Items" },
  "sub.search": {
    en: "Search code, name or description...",
    hi: "कोड, नाम या विवरण खोजें...",
    hg: "Code, naam ya description dhundo...",
  },
  "sub.empty": { en: "No itemSubGroups yet.", hi: "अभी कोई आइटम उप-समूह नहीं।", hg: "Abhi koi item sub group nahi." },
  "sub.allStatuses": { en: "All statuses", hi: "सभी स्थिति", hg: "Sab status" },
  "sub.activeOnly": { en: "Active only", hi: "केवल सक्रिय", hg: "Sirf active" },
  "sub.inactiveOnly": { en: "Inactive only", hi: "केवल निष्क्रिय", hg: "Sirf inactive" },
  "sub.editTitle": { en: "Edit itemSubGroup", hi: "आइटम उप-समूह संपादित करें", hg: "Item sub group edit karo" },
  "sub.formDesc": {
    en: "ItemSubGroups nest one level: Seeds is the parent of Vegetable Seeds.",
    hi: "आइटम उप-समूह एक स्तर तक नेस्ट होते हैं: Seeds, Vegetable Seeds का पैरेंट है।",
    hg: "Item sub groups ek level tak nest hote hain: Seeds, Vegetable Seeds ka parent hai.",
  },
  "sub.parentSubGroup": { en: "Parent itemSubGroup", hi: "पैरेंट आइटम उप-समूह", hg: "Parent item sub group" },
  "sub.topLevel": { en: "Top level", hi: "शीर्ष स्तर", hg: "Sabse upar" },
  "sub.displayOrder": { en: "Display order", hi: "प्रदर्शन क्रम", hg: "Display order" },
  "sub.displayOrderHint": {
    en: "Lower numbers appear first.",
    hi: "छोटी संख्या पहले दिखती है।",
    hg: "Chhoti number pehle dikhti hai.",
  },
  "sub.description": { en: "Description", hi: "विवरण", hg: "Vivran" },
  "sub.deleteTitle": { en: "Delete itemSubGroup?", hi: "आइटम उप-समूह हटाएँ?", hg: "Item sub group delete karein?" },
  "sub.deleteDesc": {
    en: "will be hidden from lists. ItemSubGroups still used by items cannot be deleted - set them inactive instead.",
    hi: "सूची से छिप जाएगा। जिन आइटम उप-समूहों का उपयोग आइटम में हो रहा है उन्हें हटाया नहीं जा सकता - उन्हें निष्क्रिय कर दें।",
    hg: "list se chhup jayega. Jin item sub groups ka use items me ho raha hai unhe delete nahi kar sakte - unhe inactive kar do.",
  },

  /* --------------------------- dynamic fields ------------------------------ */
  "field.notSet": { en: "Not set", hi: "तय नहीं", hg: "Set nahi" },
  "field.select": { en: "Select", hi: "चुनें", hg: "Choose karein" },
  "field.noListPrefix": { en: "No", hi: "कोई", hg: "Koi" },
  "field.noListSuffix": { en: "list available", hi: "सूची उपलब्ध नहीं", hg: "list available nahi" },
  "field.inUnit": { en: "In", hi: "में", hg: "Mein" },
  "field.isRequired": { en: "is required.", hi: "आवश्यक है।", hg: "zaroori hai." },
  "field.enterNumber": { en: "Enter a number.", hi: "एक संख्या दर्ज करें।", hg: "Ek number daalein." },
  "field.cannotBeBelow": { en: "Cannot be below", hi: "इससे कम नहीं हो सकता:", hg: "Isse kam nahi ho sakta:" },
  "field.cannotBeAbove": { en: "Cannot be above", hi: "इससे ज़्यादा नहीं हो सकता:", hg: "Isse zyada nahi ho sakta:" },
  "field.keepUnder": { en: "Keep it under", hi: "इसे इससे कम रखें:", hg: "Ise itna kam rakhein:" },
  "field.characters": { en: "characters.", hi: "अक्षर।", hg: "characters." },
};
