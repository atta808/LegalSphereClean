import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

export default function LegalInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = "default",
  editable = true,
  secureTextEntry = false,
  style,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {/* Floating Premium Label */}
      {label ? (
        <View style={styles.labelContainer}>
          <View style={[styles.labelPill, focused && styles.focusedLabelPill]}>
            <Text style={[styles.label, focused && styles.focusedLabel]}>
              {label}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Glassy White Input */}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.focusedWrapper,
          !editable && styles.disabledWrapper,
        ]}
      >
        <TextInput
          multiline
          textAlignVertical="top"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(71,85,105,0.55)"
          multiline={multiline}
          keyboardType={keyboardType}
          editable={editable}
          secureTextEntry={secureTextEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor="#6F89A5"
          cursorColor="#6F89A5"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, multiline && styles.multilineInput, style]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 0,
  },

  // Floating Label Position
  labelContainer: {
    position: "absolute",
    top: -10,
    left: 16,
    zIndex: 10,
    flexDirection: "row",
  },

  // Floating Label Pill
  labelPill: {
    backgroundColor: "#F3EFDF",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },

  focusedLabelPill: {
    backgroundColor: "#F3EFDF",
    borderColor: "rgba(111,137,165,0.35)",
  },

  // Label Text
  label: {
    color: "#5B6470",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "capitalize",
  },

  focusedLabel: {
    color: "#6F89A5",
  },

  // Main Glass Input
  inputWrapper: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    borderRadius: 18,
    paddingHorizontal: 16,
    minHeight: 50,
    maxHeight: 80,
    justifyContent: "center",

    shadowColor: "#94A3B8",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },

  // Focus State
  focusedWrapper: {
    borderColor: "rgba(111,137,165,0.45)",
    shadowColor: "#CBD5E1",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },

  // Disabled State
  disabledWrapper: {
    opacity: 0.5,
    backgroundColor: "rgba(226,232,240,0.5)",
  },

  // Input Text
  input: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "600",
    height: 50,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: "center",
  },

  // Multiline
  multilineInput: {
    maxHeight: 80,
    textAlignVertical: "center",
  },
});
