import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTimelineByCaseId } from "../services/sqliteService";
import { toDisplay } from "../utils/date";

export default function TimelineScreen({ route, navigation }) {
  const { caseId } = route.params;
  const insets = useSafeAreaInsets();

  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = () => {
    const data = getTimelineByCaseId(caseId);
    setTimeline(data);
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.row}>
      {/* Timeline Indicator */}
      <View style={styles.timelineLeft}>
        <View style={styles.dot} />
        {index !== timeline.length - 1 && <View style={styles.line} />}
      </View>

      {/* Content */}
      <View style={styles.card}>
        <Text style={styles.date}>
          {toDisplay(item.hearingDate)}
        </Text>

        <Text style={styles.label}>Stage</Text>
        <Text style={styles.value}>{item.stage || "-"}</Text>

        <Text style={styles.label}>Court</Text>
        <Text style={styles.value}>{item.court || "-"}</Text>
        <Text style={styles.label}>Judge</Text>
        <Text style={styles.value}>{item.judge || "-"}</Text>
        <Text style={styles.label}>Proceeding</Text>
        <Text style={styles.value}>{item.proceedings || "-"}</Text>

        {item.description ? (
          <>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{item.description}</Text>
          </>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Timeline</Text>

        <View style={{ width: 30 }} />
      </View>

      {/* LIST */}
      <FlatList
        data={timeline}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No timeline available</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  back: {
    fontSize: 28,
    color: "#1E3A8A",
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E3A8A",
  },

  row: {
    flexDirection: "row",
    marginBottom: 20,
  },

  timelineLeft: {
    alignItems: "center",
    marginRight: 10,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1E3A8A",
  },

  line: {
    width: 2,
    flex: 1,
    backgroundColor: "#CBD5F5",
    marginTop: 2,
  },

  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  date: {
    fontWeight: "700",
    marginBottom: 6,
    color: "#1E3A8A",
  },

  label: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 6,
  },

  value: {
    fontSize: 14,
    color: "#0F172A",
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748B",
  },
});
