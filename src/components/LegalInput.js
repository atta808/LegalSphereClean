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
    <View style={[styles.container, style]}>
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
          style={[styles.input, multiline && styles.multilineInput]}
        />
      </View>
    </View>
  );
}

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  container: {
    width: "100%",
    flexShrink: 0,
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
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  focusedLabelPill: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },

  // Label Text
  label: {
    color: colors.secondaryText,
    fontSize: 12,
    fontWeight: "500",
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

    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    } : {
      elevation: 0,
    }),
  },

  // Focus State
  focusedWrapper: {
    borderColor: colors.primary,
    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    } : {
      elevation: 0,
    }),
  },

  // Disabled State
  disabledWrapper: {
    opacity: 0.5,
    backgroundColor: colors.disabled,
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
