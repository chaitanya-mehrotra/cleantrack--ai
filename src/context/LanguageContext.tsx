import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'hi' | 'hinglish';

interface Translations {
  appName: string;
  home: string;
  report: string;
  map: string;
  myReports: string;
  adminPortal: string;
  workerPortal: string;
  login: string;
  logout: string;
  heroTitle: string;
  heroSubtitle: string;
  reportGarbage: string;
  viewMap: string;
  describeWaste: string;
  uploadImage: string;
  location: string;
  aiClassification: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  statusSubmitted: string;
  statusAssigned: string;
  statusInProgress: string;
  statusCleanupReview: string;
  statusResolved: string;
  importLegacy: string;
}

const DICTIONARY: Record<Language, Translations> = {
  en: {
    appName: 'CleanTrack AI',
    home: 'Home',
    report: 'Report Waste',
    map: 'Live Map',
    myReports: 'My Reports',
    adminPortal: 'Admin Portal',
    workerPortal: 'Worker Portal',
    login: 'Login',
    logout: 'Logout',
    heroTitle: 'Smart Waste Intelligence for Cleaner Cities',
    heroSubtitle: 'Report waste, detect civic problems via multimodal AI, and track transparent resolution across Indian municipal wards.',
    reportGarbage: 'Report Waste',
    viewMap: 'Explore Live Map',
    describeWaste: 'Describe the Waste Problem',
    uploadImage: 'Upload Photo (Optional)',
    location: 'GPS Location',
    aiClassification: 'AI Diagnostic Analysis',
    priorityHigh: 'High Priority',
    priorityMedium: 'Medium Priority',
    priorityLow: 'Low Priority',
    statusSubmitted: 'Submitted',
    statusAssigned: 'Assigned',
    statusInProgress: 'In Progress',
    statusCleanupReview: 'Review Pending',
    statusResolved: 'Resolved',
    importLegacy: 'Import v1.0 Reports',
  },
  hi: {
    appName: 'क्लीनट्रैक AI',
    home: 'होम',
    report: 'कचरा रिपोर्ट करें',
    map: 'लाइव मैप',
    myReports: 'मेरी शिकायतें',
    adminPortal: 'अधिकारी पोर्टल',
    workerPortal: 'सफाईकर्मी पोर्टल',
    login: 'लॉग इन',
    logout: 'लॉग आउट',
    heroTitle: 'स्वच्छ शहरों के लिए स्मार्ट अपशिष्ट निवारण प्रणाली',
    heroSubtitle: 'कचरे की शिकायत दर्ज करें, AI द्वारा श्रेणी और प्राथमिकता जानें और नगर निगम सफाई का लाइव स्टेटस देखें।',
    reportGarbage: 'शिकायत दर्ज करें',
    viewMap: 'नक्शा देखें',
    describeWaste: 'कचरे की समस्या का विवरण दें',
    uploadImage: 'फोटो अपलोड करें (वैकल्पिक)',
    location: 'जीपीएस लोकेशन',
    aiClassification: 'AI विश्लेषण',
    priorityHigh: 'अति आवश्यक',
    priorityMedium: 'मध्यम प्राथमिकता',
    priorityLow: 'सामान्य प्राथमिकता',
    statusSubmitted: 'दर्ज',
    statusAssigned: 'आबंटित',
    statusInProgress: 'कार्य प्रगति पर',
    statusCleanupReview: 'सत्यापन लंबित',
    statusResolved: 'समाधान हो चुका',
    importLegacy: 'पुराने रिकॉर्ड्स आयात करें',
  },
  hinglish: {
    appName: 'CleanTrack AI',
    home: 'Home',
    report: 'Report Kachra',
    map: 'Live Map',
    myReports: 'Meri Complaints',
    adminPortal: 'Admin Portal',
    workerPortal: 'Worker Portal',
    login: 'Login',
    logout: 'Logout',
    heroTitle: 'Clean Cities ke liye Smart AI Waste Management',
    heroSubtitle: 'Garbage report karo, multimodal AI se priority jaan lo aur Safai Karamchariyon ka work track karo.',
    reportGarbage: 'Report Karo',
    viewMap: 'Map Dekho',
    describeWaste: 'Kachre ka detail likho',
    uploadImage: 'Photo upload karo',
    location: 'GPS Location',
    aiClassification: 'AI Analysis',
    priorityHigh: 'Urgent High',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
    statusSubmitted: 'Submitted',
    statusAssigned: 'Assigned',
    statusInProgress: 'Kaam Chalu Hai',
    statusCleanupReview: 'Review Pending',
    statusResolved: 'Safai Done',
    importLegacy: 'v1.0 Reports Import',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(
    (localStorage.getItem('cleantrack_lang') as Language) || 'en'
  );

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('cleantrack_lang', lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: changeLanguage,
        t: DICTIONARY[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
