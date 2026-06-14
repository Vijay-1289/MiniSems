// Mini Sems — Create Exam Screen (Admin)

import React, {useState, useEffect} from 'react';
import {
  StyleSheet, Text, TextInput,
  TouchableOpacity, View, ScrollView, Alert, Switch
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Spacing} from '@theme/spacing';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import {useTranslation} from 'react-i18next';
import type {AdminStackParamList} from '@apptypes/navigation.types';
import {DatePickerModal, TimePickerModal} from '../../components/common/DateTimePicker';
import {format, parseISO, isValid} from 'date-fns';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'CreateExam'>;

const EXAM_TYPES = [
  {id: 'weekly_test', label: 'Weekly Test'},
  {id: 'unit_test', label: 'Unit Test'},
  {id: 'grand_test', label: 'Grand Test'},
  {id: 'practice_test', label: 'Practice Test'},
];

const generateMockQuestions = (collegeId: string, facultyId: string, count: number) => {
  const list = [];
  const subjects = ['Mathematics', 'Physics', 'Chemistry'];
  for (let i = 1; i <= count; i++) {
    const subj = subjects[(i - 1) % 3];
    list.push({
      college_id: collegeId,
      created_by: facultyId,
      type: 'mcq',
      question_text: `Sample ${subj} Question #${i}: What is the value of x in equation ${i}x + 5 = ${i * 2 + 5}?`,
      option_a: `${i}`,
      option_b: '2',
      option_c: '3',
      option_d: '4',
      correct_answer: 'B',
      correct_answer_explanation: `Solving the equation gives x = 2.`,
      difficulty: i % 3 === 0 ? 'hard' : (i % 2 === 0 ? 'medium' : 'easy'),
      marks: 1.0,
      negative_marks: 0.25,
      chapter: `Chapter ${Math.ceil(i / 5)}`,
      topic: `${subj} Core`,
      exam_type_tags: ['practice_test', 'weekly_test']
    });
  }
  return list;
};

const CreateExamScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user} = useAuthStore();
  const {t} = useTranslation();

  // Sections state
  const [sections, setSections] = useState<any[]>([]);

  useEffect(() => {
    const fetchSections = async () => {
      if (user?.collegeId) {
        try {
          const {data} = await db.sections().select('id').eq('college_id', user.collegeId);
          if (data) setSections(data);
        } catch (err) {
          console.log('Error fetching sections:', err);
        }
      }
    };
    fetchSections();
  }, [user?.collegeId]);

  // Form Fields
  const [name, setName] = useState('');
  const [examType, setExamType] = useState<string>('weekly_test');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [totalQuestions, setTotalQuestions] = useState('');

  // Questions upload states
  const [questionsFile, setQuestionsFile] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);

  const handleUploadExcel = () => {
    if (!totalQuestions) {
      Alert.alert('Error', 'Please enter the number of questions first.');
      return;
    }
    const count = parseInt(totalQuestions, 10);
    if (isNaN(count) || count <= 0) {
      Alert.alert('Error', 'Please enter a valid number of questions.');
      return;
    }
    setQuestionsFile(`questions_template_${count}_questions.xlsx`);
    if (user?.collegeId && user?.id) {
      const mockQList = generateMockQuestions(user.collegeId, user.id, count);
      setParsedQuestions(mockQList);
      Alert.alert('Success', `Parsed and validated ${count} questions from Excel template.`);
    } else {
      Alert.alert('Error', 'User authentication details are missing.');
    }
  };

  // Picker visibility states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Automatically calculate duration
  useEffect(() => {
    if (startTime && endTime) {
      const startParts = startTime.split(':').map(Number);
      const endParts = endTime.split(':').map(Number);
      if (startParts.length >= 2 && endParts.length >= 2) {
        const startMin = startParts[0] * 60 + startParts[1];
        const endMin = endParts[0] * 60 + endParts[1];
        let diff = endMin - startMin;
        if (diff < 0) {
          // Crosses midnight
          diff += 24 * 60;
        }
        setDuration(diff.toString());
      }
    }
  }, [startTime, endTime]);

  const getDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? format(parsed, 'dd MMMM yyyy') : dateStr;
  };

  const formatTo12Hour = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
  };
  
  // Settings
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [allowReattempt, setAllowReattempt] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [showScoreImmediately, setShowScoreImmediately] = useState(true);
  
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !scheduledDate || !startTime || !endTime || !duration || !totalMarks || !totalQuestions) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    if (!questionsFile || parsedQuestions.length === 0) {
      Alert.alert('Error', 'Please upload a questions Excel sheet.');
      return;
    }
    
    setSaving(true);
    try {
      if (!user?.collegeId || !user?.id) {
        throw new Error('User not properly authenticated');
      }

      // 1. Insert Exam Header and fetch generated ID
      const {data: examData, error: examError} = await db.exams().insert({
        college_id: user.collegeId,
        created_by: user.id, // Current admin is the creator
        name,
        exam_type: examType as any,
        status: 'published', // Created as published initially so students can take it
        scheduled_date: scheduledDate,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: parseInt(duration, 10),
        total_marks: parseInt(totalMarks, 10),
        total_questions: parseInt(totalQuestions, 10),
        randomize_questions: randomizeQuestions,
        randomize_options: true, // Defaulting to true
        show_score_immediately: showScoreImmediately,
        allow_reattempt: allowReattempt,
        negative_marking: negativeMarking,
        negative_mark_value: negativeMarking ? 1 : 0,
        allow_review_marking: true,
        target_sections: sections.length > 0 ? sections.map(s => s.id) : ['b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e']
      }).select().single();
        
      if (examError) throw examError;
      if (!examData) throw new Error('Failed to retrieve created exam record.');

      const examId = examData.id;

      // 2. Insert Questions in bulk
      const {data: questionsData, error: questionsError} = await db.questions().insert(
        parsedQuestions
      ).select();

      if (questionsError) throw questionsError;
      if (!questionsData || questionsData.length === 0) {
        throw new Error('Failed to insert exam questions.');
      }

      // 3. Create default Exam Section mapping
      const {data: sectionData, error: sectionError} = await db.examSections().insert({
        college_id: user.collegeId,
        exam_id: examId,
        section_name: 'General Section',
        total_questions: parsedQuestions.length,
        marks_per_question: parseFloat((parseFloat(totalMarks) / parsedQuestions.length).toFixed(2)),
        negative_marks: negativeMarking ? 0.25 : 0.0,
        order_index: 0
      }).select().single();

      if (sectionError) throw sectionError;
      const sectionId = sectionData?.id;

      // 4. Map questions to Exam Questions mapping table
      const examQuestionsRows = questionsData.map((q, idx) => ({
        college_id: user.collegeId,
        exam_id: examId,
        question_id: q.id,
        exam_section_id: sectionId || null,
        order_index: idx,
        marks: q.marks,
        negative_marks: q.negative_marks
      }));

      const {error: mappingError} = await db.examQuestions().insert(examQuestionsRows);
      if (mappingError) throw mappingError;

      Alert.alert('Success', `Exam and ${questionsData.length} questions created successfully.`);
      navigation.goBack();
    } catch (err: any) {
      console.error('Save exam error:', err);
      Alert.alert('Error', err.message || 'Failed to create exam');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradients.adminHeader} style={styles.header}>
        <Text style={styles.title}>Create Exam</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Exam Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Weekly Math Test"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Exam Type Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Exam Type</Text>
          <View style={styles.selectors}>
            {EXAM_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[styles.selectorCell, examType === type.id && styles.selectorSelected]}
                onPress={() => setExamType(type.id)}>
                <Text style={[styles.selectorText, examType === type.id && styles.selectorTextSelected]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Scheduled Date *</Text>
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}>
            <Text style={[styles.inputText, !scheduledDate && styles.inputPlaceholder]}>
              {scheduledDate ? getDisplayDate(scheduledDate) : 'Select Date'}
            </Text>
            <Text style={styles.inputIcon}>📅</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, {flex: 1, marginRight: Spacing.sm}]}>
            <Text style={styles.label}>Start Time *</Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowStartTimePicker(true)}
              activeOpacity={0.7}>
              <Text style={[styles.inputText, !startTime && styles.inputPlaceholder]}>
                {startTime ? formatTo12Hour(startTime) : 'Select Start Time'}
              </Text>
              <Text style={styles.inputIcon}>🕒</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.formGroup, {flex: 1, marginLeft: Spacing.sm}]}>
            <Text style={styles.label}>End Time *</Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowEndTimePicker(true)}
              activeOpacity={0.7}>
              <Text style={[styles.inputText, !endTime && styles.inputPlaceholder]}>
                {endTime ? formatTo12Hour(endTime) : 'Select End Time'}
              </Text>
              <Text style={styles.inputIcon}>🕒</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, {flex: 1, marginRight: Spacing.sm}]}>
            <Text style={styles.label}>Duration (mins) *</Text>
            <View style={[styles.inputContainer, styles.disabledInput]}>
              <Text style={styles.inputText}>
                {duration || '0'}
              </Text>
            </View>
          </View>
          <View style={[styles.formGroup, {flex: 1, marginLeft: Spacing.sm}]}>
            <Text style={styles.label}>Total Marks *</Text>
            <TextInput
              style={styles.input}
              value={totalMarks}
              onChangeText={setTotalMarks}
              placeholder="100"
              keyboardType="number-pad"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={[styles.formGroup, {flex: 1, marginLeft: Spacing.sm}]}>
            <Text style={styles.label}>Questions *</Text>
            <TextInput
              style={styles.input}
              value={totalQuestions}
              onChangeText={setTotalQuestions}
              placeholder="50"
              keyboardType="number-pad"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* Question Upload Section */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Upload Questions (Excel) *</Text>
          <TouchableOpacity
            style={[
              styles.uploadContainer,
              questionsFile ? styles.uploadSuccessBorder : null
            ]}
            onPress={handleUploadExcel}
            activeOpacity={0.8}>
            <Text style={styles.uploadBtnIcon}>{questionsFile ? '✅' : '📤'}</Text>
            <View style={{flex: 1, marginLeft: Spacing.sm}}>
              <Text style={styles.uploadTitle}>
                {questionsFile ? questionsFile : 'Select Questions Excel Sheet'}
              </Text>
              <Text style={styles.uploadSubtitle}>
                {questionsFile
                  ? `${totalQuestions || '50'} questions ready to be imported`
                  : 'Click to select and parse exam questions'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Exam Settings</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Randomize Questions</Text>
          <Switch
            value={randomizeQuestions}
            onValueChange={setRandomizeQuestions}
            trackColor={{false: Colors.border, true: Colors.success}}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Allow Reattempt</Text>
          <Switch
            value={allowReattempt}
            onValueChange={setAllowReattempt}
            trackColor={{false: Colors.border, true: Colors.success}}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Negative Marking</Text>
          <Switch
            value={negativeMarking}
            onValueChange={setNegativeMarking}
            trackColor={{false: Colors.border, true: Colors.success}}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Show Score Immediately</Text>
          <Switch
            value={showScoreImmediately}
            onValueChange={setShowScoreImmediately}
            trackColor={{false: Colors.border, true: Colors.success}}
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveBtn}>
          <LinearGradient colors={Colors.gradients.primaryBlue} style={styles.saveBtnGradient}>
            <Text style={styles.saveBtnText}>
              {saving ? t('common.loading') : 'Create Exam'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={scheduledDate}
        onSelect={setScheduledDate}
      />

      <TimePickerModal
        visible={showStartTimePicker}
        onClose={() => setShowStartTimePicker(false)}
        selectedTime={startTime}
        onSelect={setStartTime}
        title="Select Start Time"
      />

      <TimePickerModal
        visible={showEndTimePicker}
        onClose={() => setShowEndTimePicker(false)}
        selectedTime={endTime}
        onSelect={setEndTime}
        title="Select End Time"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {padding: Spacing.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.white},
  closeBtn: {padding: 8},
  closeText: {color: Colors.white, fontSize: 18, fontWeight: 'bold'},
  scroll: {padding: Spacing.base, paddingBottom: 40},
  formGroup: {marginBottom: Spacing.md},
  row: {flexDirection: 'row', justifyContent: 'space-between'},
  label: {fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6},
  input: {height: 48, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.base, fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary},
  selectors: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  selectorCell: {paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border},
  selectorSelected: {backgroundColor: Colors.primarySurface, borderColor: Colors.primaryBorder},
  selectorText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary},
  selectorTextSelected: {color: Colors.primary, fontFamily: FontFamily.bold},
  sectionTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.md},
  settingRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  settingLabel: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary},
  saveBtn: {borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.xl},
  saveBtnGradient: {height: 48, alignItems: 'center', justifyContent: 'center'},
  saveBtnText: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.white},
  inputContainer: {
    height: 48,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  inputPlaceholder: {
    color: Colors.textMuted,
  },
  inputIcon: {
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: Colors.surfaceVariant,
    borderColor: Colors.borderLight,
  },
  uploadContainer: {
    height: 64,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  uploadSuccessBorder: {
    borderColor: Colors.success,
    backgroundColor: Colors.successSurface,
  },
  uploadBtnIcon: {
    fontSize: 24,
  },
  uploadTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  uploadSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

export default CreateExamScreen;
