export type Locale = "en" | "es" | "fr" | "de";

export const LOCALES: Locale[] = ["en", "es", "fr", "de"];

const dict: Record<Locale, Record<string, string>> = {
  en: {
    /* tabs */
    "tab.account": "Account",
    "tab.preferences": "Preferences",
    "tab.subscription": "Subscription",
    "tab.privacy": "Privacy",
    "tab.notifications": "Notifications",

    /* sections — account */
    "section.profile": "Profile",
    "section.security": "Security",
    "section.dangerZone": "Danger zone",

    /* sections — preferences */
    "section.appearance": "Appearance",
    "section.language": "Language",

    /* sections — subscription */
    "section.currentPlan": "Current plan",
    "section.usage": "Usage",

    /* sections — privacy */
    "section.yourData": "Your data",
    "section.legal": "Legal",
    "section.dataRequests": "Data requests",

    /* sections — notifications */
    "section.emailNotifications": "Email notifications",

    /* field labels */
    "field.email": "Email",
    "field.displayName": "Display name",
    "field.password": "Password",
    "field.theme": "Theme",
    "field.language": "Language",

    /* theme options */
    "theme.dark": "Dark",
    "theme.light": "Light",
    "theme.system": "System",

    /* buttons */
    "btn.save": "Save",
    "btn.saved": "Saved!",
    "btn.cancel": "Cancel",
    "btn.sendPasswordReset": "Send password reset email",
    "btn.deleteAccount": "Delete my account",
    "btn.confirmDelete": "Yes, delete my account",
    "btn.deleting": "Deleting…",
    "btn.upgradePro": "Upgrade to Pro",
    "btn.activatingPro": "Activating Pro…",

    /* subscription */
    "plan.free": "Free",
    "plan.pro": "Pro",
    "label.active": "Active",
    "label.unlockProFeatures": "Unlock Pro features",
    "label.allProActive": "All Pro features are active on your account.",

    /* notifications */
    "notif.clipReady": "Clip ready",
    "notif.clipReadyDesc": "Notify me when a clip finishes processing",
    "notif.productUpdates": "Product updates",
    "notif.productUpdatesDesc": "New features, templates, and improvements",
    "notif.tips": "Tips & tutorials",
    "notif.tipsDesc": "How to get the most out of StreamVex",

    /* misc */
    "label.emailCannotChange": "Email cannot be changed here.",
    "label.passwordResetSent": "Password reset email sent — check your inbox.",
    "label.deleteConfirmTitle": "Are you sure? This cannot be undone.",
    "label.notifPrefsNote":
      "Preferences are saved locally. Email delivery will be configured in a future update.",
    "label.themeNote":
      "Light and System themes apply the class — full visual styles coming soon.",
    "label.languageNote":
      "UI language preference is saved. Full translations coming soon.",
    "label.clipsThisMonth": "Clips this month",
    "label.storageUsed": "Storage used",
    "label.exports": "Exports",
    "label.trackingComingSoon": "Tracking coming soon",
  },

  es: {
    "tab.account": "Cuenta",
    "tab.preferences": "Preferencias",
    "tab.subscription": "Suscripción",
    "tab.privacy": "Privacidad",
    "tab.notifications": "Notificaciones",

    "section.profile": "Perfil",
    "section.security": "Seguridad",
    "section.dangerZone": "Zona de peligro",
    "section.appearance": "Apariencia",
    "section.language": "Idioma",
    "section.currentPlan": "Plan actual",
    "section.usage": "Uso",
    "section.yourData": "Tus datos",
    "section.legal": "Legal",
    "section.dataRequests": "Solicitudes de datos",
    "section.emailNotifications": "Notificaciones por correo",

    "field.email": "Correo electrónico",
    "field.displayName": "Nombre de perfil",
    "field.password": "Contraseña",
    "field.theme": "Tema",
    "field.language": "Idioma",

    "theme.dark": "Oscuro",
    "theme.light": "Claro",
    "theme.system": "Sistema",

    "btn.save": "Guardar",
    "btn.saved": "¡Guardado!",
    "btn.cancel": "Cancelar",
    "btn.sendPasswordReset": "Enviar correo de restablecimiento",
    "btn.deleteAccount": "Eliminar mi cuenta",
    "btn.confirmDelete": "Sí, eliminar mi cuenta",
    "btn.deleting": "Eliminando…",
    "btn.upgradePro": "Actualizar a Pro",
    "btn.activatingPro": "Activando Pro…",

    "plan.free": "Gratis",
    "plan.pro": "Pro",
    "label.active": "Activo",
    "label.unlockProFeatures": "Desbloquear funciones Pro",
    "label.allProActive": "Todas las funciones Pro están activas en tu cuenta.",

    "notif.clipReady": "Clip listo",
    "notif.clipReadyDesc": "Notificarme cuando un clip termine de procesarse",
    "notif.productUpdates": "Actualizaciones",
    "notif.productUpdatesDesc": "Nuevas funciones, plantillas y mejoras",
    "notif.tips": "Consejos y tutoriales",
    "notif.tipsDesc": "Cómo sacar el máximo partido a StreamVex",

    "label.emailCannotChange": "El correo no se puede cambiar aquí.",
    "label.passwordResetSent":
      "Correo de restablecimiento enviado — revisa tu bandeja de entrada.",
    "label.deleteConfirmTitle": "¿Estás seguro? Esto no se puede deshacer.",
    "label.notifPrefsNote":
      "Las preferencias se guardan localmente. El envío de correos se configurará en una actualización futura.",
    "label.themeNote":
      "Los temas Claro y Sistema aplican la clase — estilos visuales completos próximamente.",
    "label.languageNote":
      "La preferencia de idioma se guarda. Traducciones completas próximamente.",
    "label.clipsThisMonth": "Clips este mes",
    "label.storageUsed": "Almacenamiento usado",
    "label.exports": "Exportaciones",
    "label.trackingComingSoon": "Seguimiento próximamente",
  },

  fr: {
    "tab.account": "Compte",
    "tab.preferences": "Préférences",
    "tab.subscription": "Abonnement",
    "tab.privacy": "Confidentialité",
    "tab.notifications": "Notifications",

    "section.profile": "Profil",
    "section.security": "Sécurité",
    "section.dangerZone": "Zone dangereuse",
    "section.appearance": "Apparence",
    "section.language": "Langue",
    "section.currentPlan": "Plan actuel",
    "section.usage": "Utilisation",
    "section.yourData": "Vos données",
    "section.legal": "Légal",
    "section.dataRequests": "Demandes de données",
    "section.emailNotifications": "Notifications par e-mail",

    "field.email": "E-mail",
    "field.displayName": "Nom affiché",
    "field.password": "Mot de passe",
    "field.theme": "Thème",
    "field.language": "Langue",

    "theme.dark": "Sombre",
    "theme.light": "Clair",
    "theme.system": "Système",

    "btn.save": "Enregistrer",
    "btn.saved": "Enregistré !",
    "btn.cancel": "Annuler",
    "btn.sendPasswordReset": "Envoyer le lien de réinitialisation",
    "btn.deleteAccount": "Supprimer mon compte",
    "btn.confirmDelete": "Oui, supprimer mon compte",
    "btn.deleting": "Suppression…",
    "btn.upgradePro": "Passer à Pro",
    "btn.activatingPro": "Activation Pro…",

    "plan.free": "Gratuit",
    "plan.pro": "Pro",
    "label.active": "Actif",
    "label.unlockProFeatures": "Débloquer les fonctionnalités Pro",
    "label.allProActive": "Toutes les fonctionnalités Pro sont actives sur votre compte.",

    "notif.clipReady": "Clip prêt",
    "notif.clipReadyDesc": "Me notifier quand un clip a fini d'être traité",
    "notif.productUpdates": "Mises à jour",
    "notif.productUpdatesDesc": "Nouvelles fonctionnalités, modèles et améliorations",
    "notif.tips": "Conseils & tutoriels",
    "notif.tipsDesc": "Comment tirer le meilleur parti de StreamVex",

    "label.emailCannotChange": "L'e-mail ne peut pas être modifié ici.",
    "label.passwordResetSent":
      "E-mail de réinitialisation envoyé — vérifiez votre boîte de réception.",
    "label.deleteConfirmTitle": "Êtes-vous sûr ? Cette action est irréversible.",
    "label.notifPrefsNote":
      "Les préférences sont enregistrées localement. L'envoi d'e-mails sera configuré dans une future mise à jour.",
    "label.themeNote":
      "Les thèmes Clair et Système appliquent la classe — styles visuels complets à venir.",
    "label.languageNote":
      "La préférence de langue est enregistrée. Traductions complètes à venir.",
    "label.clipsThisMonth": "Clips ce mois-ci",
    "label.storageUsed": "Stockage utilisé",
    "label.exports": "Exportations",
    "label.trackingComingSoon": "Suivi à venir",
  },

  de: {
    "tab.account": "Konto",
    "tab.preferences": "Einstellungen",
    "tab.subscription": "Abonnement",
    "tab.privacy": "Datenschutz",
    "tab.notifications": "Benachrichtigungen",

    "section.profile": "Profil",
    "section.security": "Sicherheit",
    "section.dangerZone": "Gefahrenzone",
    "section.appearance": "Darstellung",
    "section.language": "Sprache",
    "section.currentPlan": "Aktueller Plan",
    "section.usage": "Nutzung",
    "section.yourData": "Ihre Daten",
    "section.legal": "Rechtliches",
    "section.dataRequests": "Datenanfragen",
    "section.emailNotifications": "E-Mail-Benachrichtigungen",

    "field.email": "E-Mail",
    "field.displayName": "Anzeigename",
    "field.password": "Passwort",
    "field.theme": "Design",
    "field.language": "Sprache",

    "theme.dark": "Dunkel",
    "theme.light": "Hell",
    "theme.system": "System",

    "btn.save": "Speichern",
    "btn.saved": "Gespeichert!",
    "btn.cancel": "Abbrechen",
    "btn.sendPasswordReset": "Passwort zurücksetzen senden",
    "btn.deleteAccount": "Konto löschen",
    "btn.confirmDelete": "Ja, Konto löschen",
    "btn.deleting": "Wird gelöscht…",
    "btn.upgradePro": "Auf Pro upgraden",
    "btn.activatingPro": "Pro wird aktiviert…",

    "plan.free": "Kostenlos",
    "plan.pro": "Pro",
    "label.active": "Aktiv",
    "label.unlockProFeatures": "Pro-Funktionen freischalten",
    "label.allProActive": "Alle Pro-Funktionen sind auf Ihrem Konto aktiv.",

    "notif.clipReady": "Clip fertig",
    "notif.clipReadyDesc": "Benachrichtigen, wenn ein Clip fertig verarbeitet ist",
    "notif.productUpdates": "Produkt-Updates",
    "notif.productUpdatesDesc": "Neue Funktionen, Vorlagen und Verbesserungen",
    "notif.tips": "Tipps & Anleitungen",
    "notif.tipsDesc": "So nutzen Sie StreamVex optimal",

    "label.emailCannotChange": "E-Mail kann hier nicht geändert werden.",
    "label.passwordResetSent":
      "E-Mail zum Zurücksetzen gesendet — prüfen Sie Ihren Posteingang.",
    "label.deleteConfirmTitle": "Sind Sie sicher? Dies kann nicht rückgängig gemacht werden.",
    "label.notifPrefsNote":
      "Einstellungen werden lokal gespeichert. E-Mail-Versand wird in einem zukünftigen Update konfiguriert.",
    "label.themeNote":
      "Hell- und Systemdesign setzen die Klasse — vollständige visuelle Stile folgen bald.",
    "label.languageNote":
      "Spracheinstellung wird gespeichert. Vollständige Übersetzungen folgen bald.",
    "label.clipsThisMonth": "Clips diesen Monat",
    "label.storageUsed": "Genutzter Speicher",
    "label.exports": "Exporte",
    "label.trackingComingSoon": "Tracking folgt bald",
  },
};

/** Returns a translator function for the given locale. Falls back to English. */
export function getT(locale: Locale): (key: string) => string {
  return (key: string) => dict[locale]?.[key] ?? dict.en[key] ?? key;
}
