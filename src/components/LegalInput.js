import React, { useState, useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

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
  const { colors, resolvedTheme } = useTheme();

  const styles = useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);

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
          placeholderTextColor={colors.placeholder}
          multiline={multiline}
          keyboardType={keyboardType}
          editable={editable}
          secureTextEntry={secureTextEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, multiline && styles.multilineInput, style]}
        />
      </View>
    </View>
  );
}

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
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
    backgroundColor: resolvedTheme === "dark" ? colors.card : "#F3EFDF",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  focusedLabelPill: {
    backgroundColor: resolvedTheme === "dark" ? colors.card : "#F3EFDF",
    borderColor: colors.primary,
  },

  // Label Text
  label: {
    color: colors.secondaryText,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "capitalize",
  },

  focusedLabel: {
    color: colors.primary,
  },

  // Main Glass Input
  inputWrapper: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    minHeight: 50,
    maxHeight: 80,
    justifyContent: "center",

    shadowColor: colors.shadow,
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
    borderColor: colors.primary,
    shadowColor: colors.primary,
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
    backgroundColor: resolvedTheme === "dark" ? "#333333" : "rgba(226,232,240,0.5)",
  },

  // Input Text
  input: {
    color: colors.text,
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
