"use client";

import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useState, type ReactElement, type ReactNode } from "react";

export type Language = "en" | "fr" | "ar";
const languageKey = "sift-language";
const translations: Record<string, [string, string]> = {
  "Opening Sift...": ["Ouverture de Sift...", "جارٍ فتح سيفت..."],
  "Check your inbox": ["Vérifiez votre boîte mail", "تحقق من بريدك الوارد"],
  "Work email": ["Adresse e-mail professionnelle", "البريد الإلكتروني للعمل"],
  "Sending...": ["Envoi...", "جارٍ الإرسال..."],
  "Continue with email": ["Continuer par e-mail", "المتابعة بالبريد الإلكتروني"],
  "Workspace": ["Espace de travail", "مساحة العمل"],
  "Demo workspace": ["Espace de démonstration", "مساحة تجريبية"],
  "WORKSPACE": ["ESPACE DE TRAVAIL", "مساحة العمل"],
  "Overview": ["Vue d’ensemble", "نظرة عامة"],
  "All invoices": ["Toutes les factures", "كل الفواتير"],
  "Review queue": ["À vérifier", "قائمة المراجعة"],
  "PREFERENCES": ["PRÉFÉRENCES", "التفضيلات"],
  "Classification settings": ["Paramètres de classification", "إعدادات التصنيف"],
  "Settings": ["Paramètres", "الإعدادات"],
  "Add an invoice": ["Ajouter une facture", "إضافة فاتورة"],
  "Add invoice": ["Ajouter une facture", "إضافة فاتورة"],
  "Cloud connected": ["Cloud connecté", "السحابة متصلة"],
  "Local preview": ["Aperçu local", "معاينة محلية"],
  "Cloud workspace": ["Espace cloud", "مساحة سحابية"],
  "Demo mode": ["Mode démo", "الوضع التجريبي"],
  "YOUR WORKSPACE": ["VOTRE ESPACE", "مساحة عملك"],
  "Total invoices": ["Total des factures", "إجمالي الفواتير"],
  "Across all categories": ["Toutes catégories confondues", "في جميع الفئات"],
  "Needs review": ["À vérifier", "بحاجة إلى مراجعة"],
  "Ready for your approval": ["En attente de votre validation", "بانتظار موافقتك"],
  "Approved": ["Approuvées", "معتمدة"],
  "Organized and complete": ["Classées et complètes", "منظمة ومكتملة"],
  "Categories used": ["Catégories utilisées", "الفئات المستخدمة"],
  "Across your workspace": ["Dans tout votre espace", "في مساحة عملك"],
  "Needs your attention": ["À vérifier", "تحتاج إلى انتباهك"],
  "View all": ["Tout voir", "عرض الكل"],
  "All caught up": ["Tout est à jour", "لا توجد عناصر معلقة"],
  "Open review queue": ["Ouvrir la liste à vérifier", "فتح قائمة المراجعة"],
  "By category": ["Par catégorie", "حسب الفئة"],
  "invoices": ["factures", "فواتير"],
  "No categories yet": ["Aucune catégorie", "لا توجد فئات بعد"],
  "Recent invoices": ["Factures récentes", "الفواتير الأخيرة"],
  "INVOICE LIBRARY": ["BIBLIOTHÈQUE DE FACTURES", "مكتبة الفواتير"],
  "All": ["Toutes", "الكل"],
  "Search invoices...": ["Rechercher des factures...", "ابحث في الفواتير..."],
  "Search invoices": ["Rechercher des factures", "البحث في الفواتير"],
  "Export CSV": ["Exporter en CSV", "تصدير CSV"],
  "INVOICE": ["FACTURE", "الفاتورة"],
  "CLASSIFICATION": ["CLASSIFICATION", "التصنيف"],
  "AMOUNT": ["MONTANT", "المبلغ"],
  "STATUS": ["STATUT", "الحالة"],
  "No invoices found": ["Aucune facture trouvée", "لم يتم العثور على فواتير"],
  "Try a different search term.": ["Essayez un autre terme de recherche.", "جرّب عبارة بحث أخرى."],
  "Home": ["Accueil", "الرئيسية"],
  "Invoices": ["Factures", "الفواتير"],
  "Review": ["Vérifier", "مراجعة"],
  "Unknown vendor": ["Fournisseur inconnu", "مورد غير معروف"],
  "Vendor": ["Fournisseur", "المورد"],
  "Invoice number": ["Numéro de facture", "رقم الفاتورة"],
  "Invoice date": ["Date de facture", "تاريخ الفاتورة"],
  "Amount": ["Montant", "المبلغ"],
  "Currency": ["Devise", "العملة"],
  "DZD / DA (Algerian dinar)": ["DZD / DA (dinar algérien)", "DZD / DA (دينار جزائري)"],
  "Invoice type": ["Type de facture", "نوع الفاتورة"],
  "Expense category": ["Catégorie de dépense", "فئة المصروفات"],
  "Department": ["Service", "القسم"],
  "Entity": ["Entité", "الكيان"],
  "Notes": ["Remarques", "ملاحظات"],
  "Add a note for your team...": ["Ajoutez une note pour votre équipe...", "أضف ملاحظة لفريقك..."],
  "NEW INVOICE": ["NOUVELLE FACTURE", "فاتورة جديدة"],
  "Review suggestions": ["Vérifier les suggestions", "مراجعة الاقتراحات"],
  "Drag and drop your invoice": ["Glissez et déposez votre facture", "اسحب الفاتورة وأفلتها"],
  "PDF, PNG, JPG or WebP · Up to 10 MB": ["PDF, PNG, JPG ou WebP · Jusqu’à 10 Mo", "PDF أو PNG أو JPG أو WebP · حتى 10 ميغابايت"],
  "Choose another file": ["Choisir un autre fichier", "اختر ملفًا آخر"],
  "Browse files": ["Parcourir les fichiers", "تصفح الملفات"],
  "Take a photo with your phone": ["Prendre une photo avec votre téléphone", "التقط صورة بهاتفك"],
  "AI suggested these details": ["Détails proposés par l’IA", "تفاصيل مقترحة بالذكاء الاصطناعي"],
  "Basic rules suggested these details": ["Détails proposés par les règles", "تفاصيل مقترحة بالقواعد الأساسية"],
  "Enter invoice details": ["Saisir les détails", "أدخل تفاصيل الفاتورة"],
  "Enter manually": ["Saisir manuellement", "إدخال يدوي"],
  "Classifying...": ["Classification...", "جارٍ التصنيف..."],
  "Classify invoice": ["Classer la facture", "تصنيف الفاتورة"],
  "Back": ["Retour", "رجوع"],
  "Save for review": ["Enregistrer pour vérification", "حفظ للمراجعة"],
  "Approve & save": ["Approuver et enregistrer", "اعتماد وحفظ"],
  "Invoice details": ["Détails de la facture", "تفاصيل الفاتورة"],
  "View file": ["Voir le fichier", "عرض الملف"],
  "Invoice information": ["Informations de la facture", "معلومات الفاتورة"],
  "AI suggested": ["Proposé par l’IA", "مقترح بالذكاء الاصطناعي"],
  "Rule suggested": ["Proposé par les règles", "مقترح بالقواعد"],
  "Sample data": ["Exemple", "بيانات تجريبية"],
  "Manually entered": ["Saisie manuelle", "أدخل يدويًا"],
  "Approve invoice": ["Approuver la facture", "اعتماد الفاتورة"],
  "Delete this invoice?": ["Supprimer cette facture ?", "حذف هذه الفاتورة؟"],
  "This removes the invoice and its uploaded file from your workspace.": ["La facture et son fichier seront supprimés de votre espace.", "سيؤدي هذا إلى حذف الفاتورة وملفها من مساحة عملك."],
  "Cancel": ["Annuler", "إلغاء"],
  "Delete invoice": ["Supprimer la facture", "حذف الفاتورة"],
  "Saving...": ["Enregistrement...", "جارٍ الحفظ..."],
  "Save changes": ["Enregistrer", "حفظ التغييرات"],
  "Invoice types": ["Types de factures", "أنواع الفواتير"],
  "Add an invoice type": ["Ajouter un type de facture", "أضف نوع فاتورة"],
  "Departments": ["Services", "الأقسام"],
  "Add a department": ["Ajouter un service", "أضف قسمًا"],
  "Entities": ["Entités", "الكيانات"],
  "Add an entity": ["Ajouter une entité", "أضف كيانًا"],
  "Expense categories": ["Catégories de dépenses", "فئات المصروفات"],
  "Add a category": ["Ajouter une catégorie", "أضف فئة"],
  "Add": ["Ajouter", "إضافة"],
  "Supabase connected": ["Supabase connecté", "Supabase متصل"],
  "Invoice deleted.": ["Facture supprimée.", "تم حذف الفاتورة."],
  "Classification options saved.": ["Options de classification enregistrées.", "تم حفظ خيارات التصنيف."],
  "Invoice added to your review queue.": ["Facture ajoutée à la liste de vérification.", "أُضيفت الفاتورة إلى قائمة المراجعة."],
  "Invoice updated.": ["Facture mise à jour.", "تم تحديث الفاتورة."],
  "Add the vendor before saving.": ["Ajoutez le fournisseur avant d’enregistrer.", "أضف المورد قبل الحفظ."],
  "Choose a PDF, PNG, JPG or WebP under 10 MB.": ["Choisissez un PDF, PNG, JPG ou WebP de moins de 10 Mo.", "اختر PDF أو PNG أو JPG أو WebP بحجم أقل من 10 ميغابايت."],
  "Sign out": ["Se déconnecter", "تسجيل الخروج"],
  "Open menu": ["Ouvrir le menu", "فتح القائمة"],
  "Close menu": ["Fermer le menu", "إغلاق القائمة"],
  "Main navigation": ["Navigation principale", "التنقل الرئيسي"],
  "Preferences": ["Préférences", "التفضيلات"],
  "Mobile navigation": ["Navigation mobile", "التنقل عبر الهاتف"],
  "Close": ["Fermer", "إغلاق"],
  "Close details": ["Fermer les détails", "إغلاق التفاصيل"],
  "Account": ["Compte", "الحساب"],
  "Remove": ["Supprimer", "إزالة"],
  "Original file is unavailable for this demo item.": ["Fichier d’origine indisponible pour cet exemple.", "الملف الأصلي غير متاح لهذا المثال."],
  "Could not open this file.": ["Impossible d’ouvrir ce fichier.", "تعذر فتح هذا الملف."],
  "Could not classify this invoice.": ["Impossible de classer cette facture.", "تعذر تصنيف هذه الفاتورة."],
  "Could not save invoice.": ["Impossible d’enregistrer la facture.", "تعذر حفظ الفاتورة."],
  "Please sign in first.": ["Veuillez d’abord vous connecter.", "يرجى تسجيل الدخول أولًا."],
  "We sent a sign-in link to": ["Nous avons envoyé un lien de connexion à", "أرسلنا رابط تسجيل الدخول إلى"],
  "Showing": ["Affichage de", "عرض"],
  "of": ["sur", "من أصل"],
  "AI confidence": ["Fiabilité de l’IA", "درجة ثقة الذكاء الاصطناعي"],
  "Ready to classify": ["Prêt à classer", "جاهز للتصنيف"],
  "This scanned PDF has no selectable text. Upload a photo or image for AI reading.": ["Ce PDF numérisé ne contient pas de texte sélectionnable. Importez une photo ou une image pour la lecture par l’IA.", "ملف PDF الممسوح لا يحتوي على نص قابل للتحديد. ارفع صورة ليقرأها الذكاء الاصطناعي."],
  "Sign in to Sift": ["Se connecter à Sift", "تسجيل الدخول إلى سيفت"],
  "Your invoices are private.": ["Vos factures restent privées.", "فواتيرك خاصة."],
  "Changes stay in this browser. Uploaded files aren’t saved.": ["Les modifications restent dans ce navigateur. Les fichiers importés ne sont pas enregistrés.", "تبقى التغييرات في هذا المتصفح. لا تُحفظ الملفات المرفوعة."],
  "AI classification sends invoice content to Groq.": ["La classification par IA envoie le contenu des factures à Groq.", "يرسل التصنيف بالذكاء الاصطناعي محتوى الفاتورة إلى Groq."],
  "Saved to your private workspace.": ["Enregistré dans votre espace privé.", "محفوظ في مساحة عملك الخاصة."],
  "Saved in this browser. Connect Supabase to sync across devices.": ["Enregistré dans ce navigateur. Connectez Supabase pour synchroniser entre appareils.", "محفوظ في هذا المتصفح. اربط Supabase للمزامنة بين الأجهزة."],
};

const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void }>({ language: "en", setLanguage: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem(languageKey);
    if (saved === "fr" || saved === "ar") {
      // Restore the user preference after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguage(saved);
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    localStorage.setItem(languageKey, language);
  }, [language, hydrated]);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }

export function translate(text: string, language: Language) {
  if (language === "en") return text;
  const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const key = match?.[2] || text;
  const value = translations[key]?.[language === "fr" ? 0 : 1];
  return value ? `${match?.[1] || ""}${value}${match?.[3] || ""}` : text;
}

// Translate display strings while keeping stored invoice values and taxonomy IDs intact.
function localizeNode(node: ReactNode, language: Language): ReactNode {
  if (typeof node === "string") return translate(node, language);
  if (Array.isArray(node)) return node.map((item) => localizeNode(item, language));
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  const props: Record<string, unknown> = {};
  for (const name of ["placeholder", "aria-label", "title", "label", "description", "change"]) {
    if (typeof element.props[name] === "string") props[name] = translate(element.props[name], language);
  }
  if (element.props.children !== undefined) props.children = Children.map(element.props.children as ReactNode, (child) => localizeNode(child, language));
  return cloneElement(element, props);
}

export function useLocalize() {
  const { language } = useLanguage();
  return <T extends ReactElement>(element: T): T => language === "en" ? element : localizeNode(element, language) as T;
}
