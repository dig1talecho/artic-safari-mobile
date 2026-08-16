import { Pressable, StyleSheet, Text, View } from "react-native";
import { LANGUAGES, useTranslation } from "../i18n";
import { COLORS, RADIUS } from "../constants/theme";

/**
 * Segmented EN / NO switch. Compact enough for a header, readable enough
 * for a settings row.
 */
export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useTranslation();

  return (
    <View style={styles.wrapper}>
      {!compact && <Text style={styles.label}>{t("settings.language")}</Text>}
      <View style={styles.group} accessibilityRole="radiogroup">
        {LANGUAGES.map((option) => {
          const active = option.code === language;
          return (
            <Pressable
              key={option.code}
              onPress={() => setLanguage(option.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
              style={[styles.option, active && styles.optionActive]}
            >
              <Text style={styles.flag}>{option.flag}</Text>
              {!compact && (
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {option.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  group: {
    flexDirection: "row",
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    padding: 3,
    gap: 2,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
  },
  optionActive: {
    backgroundColor: COLORS.accent,
  },
  flag: {
    fontSize: 15,
  },
  optionText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  optionTextActive: {
    color: COLORS.background,
  },
});
