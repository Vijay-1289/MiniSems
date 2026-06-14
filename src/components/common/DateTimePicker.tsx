import React, {useState, useEffect} from 'react';
import {
  Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView, FlatList
} from 'react-native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Spacing, Shadow} from '@theme/spacing';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, parseISO, isValid
} from 'date-fns';

// ==========================================
// DATE PICKER MODAL
// ==========================================
interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSelect: (dateStr: string) => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  selectedDate,
  onSelect,
}) => {
  const initialDate = selectedDate ? parseISO(selectedDate) : new Date();
  const validInitialDate = isValid(initialDate) ? initialDate : new Date();

  const [currentMonth, setCurrentMonth] = useState<Date>(validInitialDate);
  const [tempSelected, setTempSelected] = useState<Date>(validInitialDate);

  useEffect(() => {
    if (visible && selectedDate) {
      const parsed = parseISO(selectedDate);
      if (isValid(parsed)) {
        setTempSelected(parsed);
        setCurrentMonth(parsed);
      }
    }
  }, [visible, selectedDate]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  // Build the calendar days grid
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayIndex = startOfMonth(currentMonth).getDay(); // 0 is Sunday, 6 is Saturday
  const emptyPrefix = Array(firstDayIndex).fill(null);

  const daysGrid = [...emptyPrefix, ...daysInMonth];

  const handleDaySelect = (day: Date) => {
    setTempSelected(day);
  };

  const handleConfirm = () => {
    const formatted = format(tempSelected, 'yyyy-MM-dd');
    onSelect(formatted);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                <Text style={styles.navBtnText}>◀</Text>
              </TouchableOpacity>
              <Text style={styles.monthText}>{format(currentMonth, 'MMMM yyyy')}</Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                <Text style={styles.navBtnText}>▶</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday Titles */}
          <View style={styles.weekRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Text key={day} style={styles.weekLabel}>{day}</Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.gridContainer}>
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={styles.dayCell} />;
              }

              const isSelected = isSameDay(day, tempSelected);
              const isToday = isSameDay(day, new Date());

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => handleDaySelect(day)}>
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && !isSelected && styles.dayTextToday,
                    ]}>
                    {format(day, 'd')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer Actions */}
          <View style={styles.footerRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ==========================================
// TIME PICKER MODAL
// ==========================================
interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedTime: string; // HH:mm:ss
  onSelect: (timeStr: string) => void;
  title: string;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  onClose,
  selectedTime,
  onSelect,
  title,
}) => {
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (visible) {
      if (selectedTime && selectedTime.includes(':')) {
        const parts = selectedTime.split(':');
        let h = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        if (isNaN(h)) h = 12;
        if (isNaN(m)) m = 0;

        let ampm: 'AM' | 'PM' = 'AM';
        if (h >= 12) {
          ampm = 'PM';
          if (h > 12) h -= 12;
        } else if (h === 0) {
          h = 12;
        }
        setHour(h);
        setMinute(m);
        setPeriod(ampm);
      } else {
        // Defaults to current time
        const now = new Date();
        let h = now.getHours();
        const m = Math.round(now.getMinutes() / 5) * 5 % 60; // round to nearest 5 mins
        const ampm = h >= 12 ? 'PM' : 'AM';
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
        setHour(h);
        setMinute(m);
        setPeriod(ampm);
      }
    }
  }, [visible, selectedTime]);

  const hoursList = Array.from({length: 12}, (_, i) => i + 1);
  const minutesList = Array.from({length: 60}, (_, i) => i);

  const handleConfirm = () => {
    let finalHour = hour;
    if (period === 'PM' && hour < 12) {
      finalHour += 12;
    } else if (period === 'AM' && hour === 12) {
      finalHour = 0;
    }

    const hStr = finalHour.toString().padStart(2, '0');
    const mStr = minute.toString().padStart(2, '0');
    onSelect(`${hStr}:${mStr}:00`);
    onClose();
  };

  const renderItem = (
    item: number,
    isSelected: boolean,
    onPress: () => void,
    pad: boolean = false
  ) => {
    const text = pad ? item.toString().padStart(2, '0') : item.toString();
    return (
      <TouchableOpacity
        key={item}
        onPress={onPress}
        style={[styles.pickerItem, isSelected && styles.pickerItemActive]}>
        <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
          {text}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, {width: 300, paddingBottom: Spacing.base}]}>
          <Text style={styles.timePickerTitle}>{title}</Text>

          <View style={styles.columnsContainer}>
            {/* Hour Column */}
            <View style={styles.pickerColumn}>
              <Text style={styles.columnHeader}>Hour</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollList}>
                {hoursList.map(h =>
                  renderItem(h, h === hour, () => setHour(h))
                )}
              </ScrollView>
            </View>

            {/* Minute Column */}
            <View style={styles.pickerColumn}>
              <Text style={styles.columnHeader}>Min</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollList}>
                {minutesList.map(m =>
                  renderItem(m, m === minute, () => setMinute(m), true)
                )}
              </ScrollView>
            </View>

            {/* Period Column */}
            <View style={[styles.pickerColumn, {flex: 0.8}]}>
              <Text style={styles.columnHeader}>AM/PM</Text>
              <View style={styles.periodContainer}>
                <TouchableOpacity
                  onPress={() => setPeriod('AM')}
                  style={[
                    styles.periodBtn,
                    period === 'AM' && styles.periodBtnActive,
                  ]}>
                  <Text
                    style={[
                      styles.periodText,
                      period === 'AM' && styles.periodTextActive,
                    ]}>
                    AM
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPeriod('PM')}
                  style={[
                    styles.periodBtn,
                    period === 'PM' && styles.periodBtnActive,
                  ]}>
                  <Text
                    style={[
                      styles.periodText,
                      period === 'PM' && styles.periodTextActive,
                    ]}>
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Footer Actions */}
          <View style={[styles.footerRow, {marginTop: Spacing.base}]}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '90%',
    maxWidth: 350,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    ...Shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    padding: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.borderLight,
  },
  navBtnText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  monthText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minWidth: 90,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xs,
  },
  weekLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.base,
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.secondary,
  },
  dayText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  dayTextSelected: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
  },
  dayTextToday: {
    color: Colors.secondaryDark,
    fontFamily: FontFamily.bold,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.base,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
  },
  cancelBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
  },
  confirmBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.white,
  },

  // Time Picker styles
  timePickerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 200,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnHeader: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  scrollList: {
    flex: 1,
    width: '100%',
  },
  pickerItem: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    marginVertical: 1,
  },
  pickerItemActive: {
    backgroundColor: Colors.primarySurface,
  },
  pickerItemText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  pickerItemTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
  },
  periodContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    gap: Spacing.base,
    paddingHorizontal: Spacing.xs,
  },
  periodBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodBtnActive: {
    backgroundColor: Colors.primarySurface,
    borderColor: Colors.primaryBorder,
  },
  periodText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  periodTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
  },
});
