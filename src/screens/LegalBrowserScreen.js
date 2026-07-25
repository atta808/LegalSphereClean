import React, { useRef, useState, useCallback, useEffect } from "react";
import { useTheme } from "../theme/ThemeContext";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Share,
  Clipboard,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { askDeepSeek } from "../services/deepseekService";
import { normalizeCourtJudgeFields } from "../utils/courtJudgeParser";

export default function LegalBrowserScreen({ route, navigation }) {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(
    () => createStyles(colors, resolvedTheme),
    [colors, resolvedTheme],
  );
  const { url, title, caseId, aiMode } = route.params;

  console.log("AI MODE =", aiMode);

  useEffect(() => {
    console.log("LEGAL BROWSER CASE ID =", caseId);
  }, [caseId]);

  const insets = useSafeAreaInsets();
  // Refs
  const webViewRef = useRef(null);

  // Core State
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // --- UI Workflow Handlers ---
  let headerSubtitle = currentUrl;
  if (aiMode === "autofillCase") {
    headerSubtitle = "Import New Case";
  } else if (aiMode === "syncHearing") {
    headerSubtitle = "Synchronize Hearing";
  }

  // --- Handlers & Native Actions ---
  const handleShare = async () => {
    setShowMenu(false);
    try {
      await Share.share({
        message: `LegalSphere Reference Link:\n${currentUrl}`,
        url: currentUrl,
      });
    } catch (error) {
      console.error("Error sharing link:", error);
    }
  };

  const handleCopyLink = () => {
    setShowMenu(false);
    Clipboard.setString(currentUrl);
  };

  const handleOpenExternal = async () => {
    setShowMenu(false);
    const supported = await Linking.canOpenURL(currentUrl);
    if (supported) {
      await Linking.openURL(currentUrl);
    }
  };

  const handleSaveCitation = () => {
    setShowMenu(false);
    navigation.navigate("Citations", {
      caseId,
      citation: currentUrl,
      description: title || "",
    });
  };

  // --- AI Injection Handlers (Reused from previous menu options) ---
  const handleAnalyzePage = () => {
    webViewRef.current?.injectJavaScript(`
      var txt = document.body.innerText;
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "PAGE_TEXT",
          text: txt,
        })
      );
      true;
    `);
  };

  const handleAutofillCase = () => {
    webViewRef.current?.injectJavaScript(`
      var txt = document.body.innerText;
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "CMS_AUTOFILL",
          text: txt,
        })
      );
      true;
    `);
  };

  const handleSyncHearing = () => {
    webViewRef.current?.injectJavaScript(`
      var txt = document.body.innerText;
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "CMS_SYNC_HEARING",
          text: txt,
        })
      );
      true;
    `);
  };

  // --- Future-Ready Workflows (Placeholders) ---
  const triggerScreenshotOCR = () => {
    setShowMenu(false);
    console.log(
      "Future Feature: Triggering high-fidelity screenshot and OCR extraction.",
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* PREMIUM HEADER */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 6,
            height: insets.top + 66,
          },
        ]}
      >
        <View style={styles.leftSection}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
            accessibilityLabel="Close Browser"
          >
            <Ionicons name="close" size={22} color={colors.primaryDark} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text numberOfLines={1} style={styles.title}>
              {title || "Legal Workflow"}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.url,
                (aiMode === "autofillCase" || aiMode === "syncHearing") &&
                  styles.workflowSubtitle,
              ]}
            >
              {headerSubtitle}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="remove-outline"
              size={22}
              color={colors.primaryDark}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.iconButton}
            onPress={() => setShowMenu(!showMenu)}
            accessibilityLabel="More Options"
          >
            <Ionicons
              name={showMenu ? "ellipsis-vertical" : "ellipsis-horizontal"}
              size={20}
              color={colors.primaryDark}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* LINEAR PROGRESS INDICATOR */}
      {loading && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>
      )}

      {/* POPUP MENU OVERLAY */}
      {showMenu && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              webViewRef.current?.reload();
            }}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.icon} />
            <Text style={styles.menuText}>Reload Page</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.menuItem}
            onPress={handleCopyLink}
          >
            <Ionicons name="copy-outline" size={18} color={colors.icon} />
            <Text style={styles.menuText}>Copy Link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.menuItem}
            onPress={handleShare}
          >
            <Ionicons
              name="share-social-outline"
              size={18}
              color={colors.icon}
            />
            <Text style={styles.menuText}>Share Resource</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.menuItem}
            onPress={handleOpenExternal}
          >
            <Ionicons name="open-outline" size={18} color={colors.icon} />
            <Text style={styles.menuText}>Open in Chrome/Safari</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* FUTURE AI & WORKFLOW INTERFACES */}
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.menuItem}
            onPress={triggerScreenshotOCR}
          >
            <Ionicons name="scan-outline" size={18} color={colors.primary} />
            <Text style={[styles.menuText, styles.premiumText]}>
              Screenshot OCR (Soon)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.menuItem}
            onPress={handleSaveCitation}
          >
            <Ionicons
              name="document-text-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.menuText, styles.premiumText]}>
              Save Citation
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {analyzing && (
        <View style={styles.aiOverlay}>
          <View style={styles.aiCard}>
            <ActivityIndicator size="large" color={colors.primaryDark} />
            <Text style={styles.aiTitle}>
              {aiMode === "autofillCase"
                ? "LegalSphere CMS AI"
                : aiMode === "syncHearing"
                  ? "LegalSphere Hearing AI"
                  : "LegalSphere AI"}
            </Text>

            <Text style={styles.aiSubtitle}>
              {aiMode === "autofillCase"
                ? "Importing Case Information..."
                : aiMode === "syncHearing"
                  ? "Synchronizing Hearing..."
                  : "Analyzing Judgment..."}
            </Text>
          </View>
        </View>
      )}

      {/* CORE WEBVIEW */}
      <View style={styles.webviewWrapper}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          onMessage={async (event) => {
            try {
              const payload = JSON.parse(event.nativeEvent.data);

              if (
                payload.type !== "PAGE_TEXT" &&
                payload.type !== "CMS_AUTOFILL" &&
                payload.type !== "CMS_SYNC_HEARING"
              )
                return;

              setAnalyzing(true);
              if (payload.type === "CMS_AUTOFILL") {
                // ---------- UPDATE: askDeepSeek now returns an object with .content ----------
                const cmsResponse = await askDeepSeek(`
You are LegalSphere CMS AI.

Extract case information from Pakistan Court CMS systems.

Supported:
- Punjab CMS
- KP CFMIS
- Sindh eCourts

Return ONLY valid JSON.

{
  "caseNumber":"",
  "title":"",
  "caseType":"",
  "court":"",
  "judge":"",
  "status":"",
  "stage":"",
  "nextHearingDate":"",
  "institutionDate":""
}

RULES:

- Extract whatever fields exist.
- If a field is missing return "".
- Court and judge must be extracted independently.
- court must contain the COMPLETE CMS court designation exactly as published, including class, division, section, court number, and location after commas.
- Preserve values such as "Civil Judge Class-II/Judicial Magistrate Ist Class, M.B.Din", "Senior Civil Judge (Civil Division), Lahore", and "Additional District Judge, Gujrat".
- judge must contain ONLY the judicial officer name, for example "Mr. Muhammad Aslam", "Ms. Ayesha Khan", "Justice Ali Raza".
- Do not put a judge name, honorific, or officer name inside court.
- Do not put a court designation inside judge.
- If a single CMS line combines both values, split it into court designation and judge name.
- If you cannot identify a separate judge name with confidence, return judge as "".
- Return nextHearingDate as DD/MM/YYYY when the CMS date is visible.
- Do not explain.
- Do not summarize.
- Return JSON only.

PAGE:

${payload.text}
`);

                // Extract the actual content string from the response object
                const cmsContent = cmsResponse.content || "";

                if (__DEV__) {
                  console.log("CMS RAW:");
                  console.log(cmsContent); // ✅ Log the string content, not the object
                }

                const cmsCleaned = cmsContent
                  .replace(/```json/g, "")
                  .replace(/```/g, "")
                  .trim();

                const cmsData = JSON.parse(cmsCleaned);

                if (
                  !cmsData ||
                  typeof cmsData !== "object" ||
                  Array.isArray(cmsData)
                ) {
                  throw new Error("CMS AI returned invalid JSON object.");
                }

                const normalizedCmsData = normalizeCourtJudgeFields(cmsData, {
                  source: "CMS_AUTOFILL",
                  rawResponse: cmsCleaned,
                });

                if (__DEV__) {
                  console.log("CMS DATA:");
                  console.log(normalizedCmsData);
                }

                setAnalyzing(false);

                navigation.navigate("AddCase", {
                  aiCaseData: normalizedCmsData,
                });

                return;
              }
              if (payload.type === "CMS_SYNC_HEARING") {
                // ---------- UPDATE: same pattern, use .content ----------
                const cmsResponse = await askDeepSeek(`
You are LegalSphere Hearing Sync AI.

Extract hearing information from Pakistan Court CMS.

Return ONLY JSON.

{
  "caseNo":"",
  "court":"",
  "judge":"",
  "stage":"",
  "proceeding":"",
  "nextHearingDate":"",
  "status":""
}

RULES:

- Return empty string for missing fields.
- Court and judge must be extracted independently.
- court must contain the COMPLETE CMS court designation exactly as published, including class, division, section, court number, and location after commas.
- Preserve values such as "Civil Judge Class-II/Judicial Magistrate Ist Class, M.B.Din", "Senior Civil Judge (Civil Division), Lahore", and "Additional District Judge, Gujrat".
- judge must contain ONLY the judicial officer name, for example "Mr. Muhammad Aslam", "Ms. Ayesha Khan", "Justice Ali Raza".
- Do not put a judge name, honorific, or officer name inside court.
- Do not put a court designation inside judge.
- If a single CMS line combines both values, split it into court designation and judge name.
- If you cannot identify a separate judge name with confidence, return judge as "".
- Return nextHearingDate as DD/MM/YYYY when the CMS date is visible.
- If no proceeding exists separately, return proceeding as empty string.
- Do NOT copy stage into proceeding.
- Do NOT guess values.
- Return JSON only.

PAGE:

${payload.text}
`);

                const cmsContent = cmsResponse.content || "";
                const cleaned = cmsContent
                  .replace(/```json/g, "")
                  .replace(/```/g, "")
                  .trim();

                const hearingData = JSON.parse(cleaned);

                if (
                  !hearingData ||
                  typeof hearingData !== "object" ||
                  Array.isArray(hearingData)
                ) {
                  throw new Error(
                    "CMS hearing AI returned invalid JSON object.",
                  );
                }

                const normalizedHearingData = normalizeCourtJudgeFields(
                  hearingData,
                  {
                    source: "CMS_SYNC_HEARING",
                    rawResponse: cleaned,
                  },
                );

                setAnalyzing(false);

                navigation.navigate("UpdateCaseHearing", {
                  caseId,
                  aiHearingData: normalizedHearingData,
                });

                return;
              }
              // ---------- General PAGE_TEXT analysis ----------
              const aiResponse = await askDeepSeek(`
You are LegalSphere Research AI.

Analyze the following legal page.

RULES:

1. If this is a SEARCH RESULTS page:

Return ONLY valid JSON:

{
"type":"SEARCH_RESULTS"
}

IMPORTANT:

Do NOT summarize.

Do NOT analyze.

Do NOT extract citations.

Do NOT extract case names.

Do NOT generate legal points.

Do NOT generate keywords.

Do NOT generate tags.

Do NOT generate a title.

Do NOT generate a description.

A search results page is NOT a legal authority.

The lawyer must first open a specific full judgment.

Examples of SEARCH RESULTS pages:

- "Your Search returned total..."
- Lists of multiple citations
- Lists of multiple case names
- Search result tables
- Research result pages

For SEARCH_RESULTS return ONLY:

{
"type":"SEARCH_RESULTS"
}

2. If this is a FULL JUDGMENT page:

Return ONLY valid JSON:

{
  "type":"FULL_JUDGMENT",
  "citation":"",
  "description":""
}

IMPORTANT:

For FULL_JUDGMENT:

description must contain the COMPLETE ORIGINAL JUDGMENT TEXT, BUT LIMIT THE OUTPUT TO A MAXIMUM OF 8000 CHARACTERS.

Preserve the original wording exactly.

Do NOT summarize.

Do NOT rewrite.

Do NOT remove or modify text within the extracted portion.

If the judgment is longer than 8000 characters, stop exactly at the limit.

Return valid JSON only.

PAGE:

${payload.text}
`);

              const aiContent = aiResponse.content || "";
              if (__DEV__) {
                console.log("RAW AI:");
                console.log(aiContent); // ✅ log content string
              }

              const cleaned = aiContent
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

              if (__DEV__) {
                console.log("CLEANED AI:");
                console.log(cleaned);
              }

              if (!cleaned.startsWith("{")) {
                if (__DEV__) {
                  console.log("INVALID AI RESPONSE:");
                  console.log(cleaned);
                }

                Alert.alert("AI Error", "AI did not return valid JSON.");

                setAnalyzing(false);
                return;
              }

              const data = JSON.parse(cleaned);

              if (data.type === "SEARCH_RESULTS") {
                setAnalyzing(false);

                Alert.alert(
                  "Open Full Judgment",
                  "Search results detected. Please open a specific case law in Print Case mode before importing into LegalSphere.",
                );

                return;
              }

              // SUCCESS
              setAnalyzing(false);

              // CMS AUTO FILL MODE
              if (payload.type === "CMS_AUTOFILL") {
                if (__DEV__) {
                  console.log("GOING TO ADDCASE");
                  console.log(data);
                }
                navigation.navigate("AddCase", {
                  aiCaseData: data,
                });

                return;
              }

              // CITATION MODE
              navigation.navigate("Citations", {
                caseId,
                citation: data.citation || data.title || "",
                description: data.description || "",
              });
            } catch (e) {
              setAnalyzing(false);

              console.log("Analyze Error:", e);

              // ---------- IMPROVED ERROR REPORTING ----------
              Alert.alert(
                "AI Error",
                e?.message || String(e), // Show the actual error message
              );
            }
          }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
          onLoadStart={() => {
            setLoading(true);
            setProgress(0.1);
          }}
          onLoadProgress={({ nativeEvent }) =>
            setProgress(nativeEvent.progress)
          }
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
            setCanGoForward(navState.canGoForward);
            setCurrentUrl(navState.url);
          }}
          style={styles.webview}
        />
      </View>

      {/* DEDICATED BOTTOM NAVIGATION CONTROLS */}
      <View
        style={[
          styles.bottomToolbar,
          { paddingBottom: Platform.OS === "ios" ? insets.bottom || 12 : 8 },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          disabled={!canGoBack}
          onPress={() => webViewRef.current?.goBack()}
          style={styles.toolbarAction}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={canGoBack ? colors.text : colors.disabled}
          />
          <Text style={[styles.toolbarText, !canGoBack && styles.disabledText]}>
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          disabled={!canGoForward}
          onPress={() => webViewRef.current?.goForward()}
          style={styles.toolbarAction}
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={canGoForward ? colors.text : colors.disabled}
          />
          <Text
            style={[styles.toolbarText, !canGoForward && styles.disabledText]}
          >
            Forward
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => webViewRef.current?.reload()}
          style={styles.toolbarAction}
        >
          <Ionicons name="refresh" size={22} color={colors.text} />
          <Text style={styles.toolbarText}>Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={handleAnalyzePage}
          style={styles.toolbarAction}
        >
          <Ionicons name="sparkles" size={22} color={colors.primary} />
          <Text style={[styles.toolbarText, styles.primaryToolbarText]}>
            Analyze
          </Text>
        </TouchableOpacity>

        {aiMode === "autofillCase" && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleAutofillCase}
            style={styles.toolbarAction}
          >
            <Ionicons
              name="download-outline"
              size={22}
              color={colors.primary}
            />
            <Text style={[styles.toolbarText, styles.primaryToolbarText]}>
              Import Case
            </Text>
          </TouchableOpacity>
        )}

        {aiMode === "syncHearing" && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleSyncHearing}
            style={styles.toolbarAction}
          >
            <Ionicons
              name="sync-circle-outline"
              size={22}
              color={colors.primary}
            />
            <Text style={[styles.toolbarText, styles.primaryToolbarText]}>
              Sync Hearing
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors, resolvedTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
    },
    leftSection: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 12,
    },
    rightSection: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    titleContainer: {
      flex: 1,
      marginLeft: 12,
      justifyContent: "center",
    },
    title: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    url: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 2,
    },
    workflowSubtitle: {
      color: colors.primary,
      fontWeight: "600",
    },
    progressContainer: {
      height: 2,
      width: "100%",
      backgroundColor: colors.border,
      position: "absolute",
      top: StatusBar.currentHeight ? StatusBar.currentHeight + 66 : 90,
      zIndex: 30,
    },
    progressBar: {
      height: "100%",
      backgroundColor: colors.primary,
    },
    webviewWrapper: {
      flex: 1,
      zIndex: 1,
    },
    webview: {
      flex: 1,
    },
    /* Dropdown Menu Styles */
    menuDropdown: {
      position: "absolute",
      top: StatusBar.currentHeight ? StatusBar.currentHeight + 70 : 95,
      right: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 6,
      width: 220,
      zIndex: 40,
      ...Platform.select({
        ios: {
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        android: {
          elevation: 6,
        },
      }),
      borderWidth: 1,
      borderColor: colors.border,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    menuText: {
      fontSize: 14,
      color: colors.text,
      marginLeft: 12,
      fontWeight: "500",
    },
    premiumText: {
      color: colors.primary,
      fontWeight: "600",
    },
    menuDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
    /* Bottom Navigation Toolbar Styles */
    bottomToolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
      paddingHorizontal: 6,
    },
    toolbarAction: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    toolbarText: {
      fontSize: 10,
      fontWeight: "500",
      color: colors.text,
      marginTop: 4,
      textAlign: "center",
    },
    disabledText: {
      color: colors.disabled,
    },
    primaryToolbarText: {
      color: colors.primary,
      fontWeight: "700",
    },
    aiOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    },
    aiCard: {
      width: 280,
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 24,
      alignItems: "center",
    },
    aiTitle: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    aiSubtitle: {
      marginTop: 8,
      color: colors.secondaryText,
      textAlign: "center",
      fontSize: 14,
      fontWeight: "500",
    },
  });
