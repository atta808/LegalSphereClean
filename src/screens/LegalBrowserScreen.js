import React, { useRef, useState, useCallback, useEffect } from "react";
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
    // Future enhancement: Add a custom toast notification here
  };

  const handleOpenExternal = async () => {
    setShowMenu(false);
    const supported = await Linking.canOpenURL(currentUrl);
    if (supported) {
      await Linking.openURL(currentUrl);
    }
  };

  // --- Future-Ready Workflows (Placeholders) ---

  const triggerScreenshotOCR = () => {
    setShowMenu(false);
    console.log(
      "Future Feature: Triggering high-fidelity screenshot and OCR extraction.",
    );
  };

  const triggerSelectAllWorkflow = () => {
    setShowMenu(false);
    console.log(
      "Future Feature: Initializing Select All text layer for AI injection.",
    );
  };
  const handleSaveCitation = () => {
    setShowMenu(false);

    navigation.navigate("Citations", {
      caseId,
      citation: currentUrl,
      description: title || "",
    });
  };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

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
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
            accessibilityLabel="Close Browser"
          >
            <Ionicons name="close" size={22} color="#1e3a8a" />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text numberOfLines={1} style={styles.title}>
              {title || "Legal Workflow"}
            </Text>
            <Text numberOfLines={1} style={styles.url}>
              {currentUrl}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="remove-outline" size={22} color="#1e3a8a" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowMenu(!showMenu)}
            accessibilityLabel="More Options"
          >
            <Ionicons
              name={showMenu ? "ellipsis-vertical" : "ellipsis-horizontal"}
              size={20}
              color="#1e3a8a"
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
            style={styles.menuItem}
            onPress={() => webViewRef.current?.reload()}
          >
            <Ionicons name="refresh-outline" size={18} color="#374151" />
            <Text style={styles.menuText}>Reload Page</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleCopyLink}>
            <Ionicons name="copy-outline" size={18} color="#374151" />
            <Text style={styles.menuText}>Copy Link</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color="#374151" />
            <Text style={styles.menuText}>Share Resource</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleOpenExternal}
          >
            <Ionicons name="open-outline" size={18} color="#374151" />
            <Text style={styles.menuText}>Open in Chrome/Safari</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* FUTURE AI & WORKFLOW INTERFACES */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={triggerScreenshotOCR}
          >
            <Ionicons name="scan-outline" size={18} color="#2563eb" />
            <Text style={[styles.menuText, styles.premiumText]}>
              Screenshot OCR (Soon)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              webViewRef.current?.injectJavaScript(`
 const txt = document.body.innerText;

window.ReactNativeWebView.postMessage(
  JSON.stringify({
    type: "PAGE_TEXT",
    text: txt,
  })
);

true;
`);
            }}
          >
            <Ionicons name="sparkles-outline" size={18} color="#2563eb" />
            <Text style={[styles.menuText, styles.premiumText]}>
              Analyze Current Page
            </Text>
          </TouchableOpacity>
          {aiMode === "autofillCase" && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                webViewRef.current?.injectJavaScript(`
        const txt = document.body.innerText;

        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "CMS_AUTOFILL",
            text: txt,
          })
        );

        true;
      `);
              }}
            >
              <Ionicons name="sparkles-outline" size={18} color="#2563eb" />
              <Text style={[styles.menuText, styles.premiumText]}>
                AI Fill Add Case
              </Text>
            </TouchableOpacity>
          )}
          {aiMode === "syncHearing" && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                webViewRef.current?.injectJavaScript(`
        const txt = document.body.innerText;

        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "CMS_SYNC_HEARING",
            text: txt,
          })
        );

        true;
      `);
              }}
            >
              <Ionicons name="sparkles-outline" size={18} color="#2563eb" />
              <Text style={[styles.menuText, styles.premiumText]}>
                Sync Hearing From CMS
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSaveCitation}
          >
            <Ionicons name="document-text-outline" size={18} color="#2563eb" />
            <Text style={[styles.menuText, styles.premiumText]}>
              Save Citation
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {analyzing && (
        <View style={styles.aiOverlay}>
          <View style={styles.aiCard}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.aiTitle}>
              {aiMode === "autofillCase"
                ? "LegalSphere CMS AI"
                : aiMode === "syncHearing"
                  ? "LegalSphere Hearing AI"
                  : "LegalSphere AI"}
            </Text>

            <Text style={styles.aiSubtitle}>
              {aiMode === "autofillCase"
                ? "Extracting Case Information..."
                : aiMode === "syncHearing"
                  ? "Fetching Latest Hearing..."
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
                const cmsResult = await askDeepSeek(`
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

                console.log("CMS RAW:");
                console.log(cmsResult);

                const cmsCleaned = cmsResult
                  .replace(/```json/g, "")
                  .replace(/```/g, "")
                  .trim();

                const cmsData = JSON.parse(cmsCleaned);

                if (!cmsData || typeof cmsData !== "object" || Array.isArray(cmsData)) {
                  throw new Error("CMS AI returned invalid JSON object.");
                }

                const normalizedCmsData = normalizeCourtJudgeFields(cmsData, {
                  source: "CMS_AUTOFILL",
                  rawResponse: cmsCleaned,
                });

                console.log("CMS DATA:");
                console.log(normalizedCmsData);

                setAnalyzing(false);

                navigation.navigate("AddCase", {
                  aiCaseData: normalizedCmsData,
                });

                return;
              }
              if (payload.type === "CMS_SYNC_HEARING") {
                const cmsResult = await askDeepSeek(`
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

                const cleaned = cmsResult
                  .replace(/```json/g, "")
                  .replace(/```/g, "")
                  .trim();

                const hearingData = JSON.parse(cleaned);

                if (
                  !hearingData ||
                  typeof hearingData !== "object" ||
                  Array.isArray(hearingData)
                ) {
                  throw new Error("CMS hearing AI returned invalid JSON object.");
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
              const aiResult = await askDeepSeek(`
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

description must contain the ENTIRE ORIGINAL TEXT.

Do NOT summarize.

Do NOT rewrite.

Do NOT remove anything.

Do NOT add anything.

PAGE:

${payload.text}
`);
              console.log("RAW AI:");
              console.log(aiResult);

              const cleaned = aiResult
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

              console.log("CLEANED AI:");
              console.log(cleaned);

              if (!cleaned.startsWith("{")) {
                console.log("INVALID AI RESPONSE:");
                console.log(cleaned);

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
                console.log("GOING TO ADDCASE");
                console.log(data);
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

              Alert.alert("AI Error", "Failed to analyze page.");
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
      <View style={styles.bottomToolbar}>
        <TouchableOpacity
          disabled={!canGoBack}
          onPress={() => webViewRef.current?.goBack()}
          style={[styles.toolbarButton, !canGoBack && styles.disabledButton]}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={canGoBack ? "#1e3a8a" : "#cbd5e1"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          disabled={!canGoForward}
          onPress={() => webViewRef.current?.goForward()}
          style={[styles.toolbarButton, !canGoForward && styles.disabledButton]}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={canGoForward ? "#1e3a8a" : "#cbd5e1"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => webViewRef.current?.reload()}
          style={styles.toolbarButton}
        >
          <Ionicons name="refresh" size={20} color="#1e3a8a" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
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
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  url: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  progressContainer: {
    height: 2,
    width: "100%",
    backgroundColor: "#f1f5f9",
    position: "absolute",
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 66 : 90,
    zIndex: 30,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#2563eb",
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
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 6,
    width: 220,
    zIndex: 40,
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  menuText: {
    fontSize: 13,
    color: "#334155",
    marginLeft: 10,
    fontWeight: "500",
  },
  premiumText: {
    color: "#2563eb",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 4,
  },
  /* Bottom Navigation Toolbar Styles */
  bottomToolbar: {
    height: 52,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#ffffff",
    paddingBottom: Platform.OS === "ios" ? 4 : 0,
  },
  toolbarButton: {
    width: 50,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.4,
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
    width: 260,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },

  aiTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },

  aiSubtitle: {
    marginTop: 8,
    color: "#64748B",
    textAlign: "center",
  },
});
