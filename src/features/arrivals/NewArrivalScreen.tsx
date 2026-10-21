import { Redirect, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth';
import {
  AppText,
  Banner,
  Button,
  ErrorView,
  FormField,
  Icon,
  LoadingView,
  PageLayout,
  ScreenHeader,
  SegmentedControl,
  SelectField,
  StepProgress,
  TextField,
  useToast,
  type SegmentOption,
  type SelectOption,
} from '@/components';
import { SPECIES, SEXES, type ArrivalDetailsInput, type Sex, type Species } from '@/domain/types';
import { useGoBack } from '@/navigation/useGoBack';
import { theme } from '@/theme';
import { formatDateInput } from '@/utils/dates';

import { isMicrochipTaken } from './arrivalApi';
import {
  useArrivalDraft,
  useCountries,
  useKennelOptions,
  useSaveArrivalDraft,
} from './hooks';
import { useAutosave } from './useAutosave';
import { EMPTY_DETAILS, MICROCHIP_LENGTH, hasErrors, validateDetails, validateMicrochipFormat } from './validation';

const TOTAL_STEPS = 2;

const speciesOptions: readonly SegmentOption<Species>[] = SPECIES.map((value) => ({ value, label: value }));
const sexOptions: readonly SegmentOption<Sex>[] = SEXES.map((value) => ({ value, label: value }));

/** Wireframe 02: New Arrival, step 1 of 2. Officers only (contractors do not see New Arrival). */
export function NewArrivalScreen() {
  const { role } = useSession();
  const draft = useArrivalDraft();

  // Hiding the entry point is not enough; the API must enforce this too.
  if (role !== 'officer') return <Redirect href="/" />;
  if (draft.isPending) return <LoadingView label="Loading draft" />;
  if (draft.isError) {
    return <ErrorView message="We couldn't load your saved draft." onRetry={() => void draft.refetch()} />;
  }
  return (
    <NewArrivalForm initial={draft.data?.details ?? EMPTY_DETAILS} restoredFrom={draft.data?.updatedAt ?? null} />
  );
}

interface NewArrivalFormProps {
  initial: ArrivalDetailsInput;
  restoredFrom: number | null;
}

function NewArrivalForm({ initial, restoredFrom }: NewArrivalFormProps) {
  const router = useRouter();
  const toast = useToast();
  const goBack = useGoBack('/');
  const kennels = useKennelOptions();
  const countries = useCountries();
  const saveDraft = useSaveArrivalDraft();

  const [details, setDetails] = useState<ArrivalDetailsInput>(initial);
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [chipTaken, setChipTaken] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkedChip = useRef<string | null>(null);

  const autosave = useAutosave(details, dirty, (value) => saveDraft.mutateAsync({ details: value }));

  const errors = useMemo(() => validateDetails(details), [details]);
  const visible = showErrors ? errors : {};
  const chipError = visible.microchip ?? (chipTaken ? 'This microchip number is already registered to an active stay.' : undefined);

  const kennelOptions: SelectOption[] = (kennels.data ?? []).map((kennel) => ({
    value: kennel.code,
    label: kennel.code,
    description: kennel.occupant ? `Currently: ${kennel.occupant}` : 'Empty',
  }));
  const countryOptions: SelectOption[] = (countries.data ?? []).map((country) => ({
    value: country.code,
    label: country.name,
  }));

  const update = (patch: Partial<ArrivalDetailsInput>) => {
    setDirty(true);
    setDetails((current) => ({ ...current, ...patch }));
  };

  const checkMicrochip = async (value: string): Promise<boolean> => {
    if (validateMicrochipFormat(value)) return false;
    if (checkedChip.current === value) return chipTaken;
    setChecking(true);
    try {
      const taken = await isMicrochipTaken(value);
      checkedChip.current = value;
      setChipTaken(taken);
      return taken;
    } finally {
      setChecking(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await autosave.flush();
      toast.show('Draft saved on this device session. You can continue it later from New Arrival.', 'success');
      router.navigate('/');
    } catch {
      toast.show("Couldn't save the draft. Please try again.", 'error');
    }
  };

  const handleContinue = async () => {
    setShowErrors(true);
    if (hasErrors(errors)) return;
    if (await checkMicrochip(details.microchip)) return;
    try {
      await autosave.flush();
      router.navigate('/arrival-exam');
    } catch {
      toast.show("Couldn't save the draft. Please try again.", 'error');
    }
  };

  const errorCount = Object.keys(visible).length + (chipTaken && !visible.microchip ? 1 : 0);
  const draftLabel =
    autosave.status === 'saving'
      ? 'Saving draft…'
      : autosave.status === 'error'
        ? "Couldn't save draft. We'll retry when you make a change."
        : 'Draft saved automatically';

  return (
    <PageLayout
      header={
        <ScreenHeader
          title="New Arrival"
          onBack={goBack}
          backLabel="Go back to Operations"
          trailing={
            <AppText variant="caption" tone="muted">{`Step 1 of ${TOTAL_STEPS}`}</AppText>
          }
          below={<StepProgress step={1} total={TOTAL_STEPS} />}
        />
      }
      footer={
        <View style={styles.footerRow}>
          <Button
            label="Save draft"
            variant="secondary"
            testID="arrival-save-draft"
            style={styles.footerButton}
            disabled={checking}
            onPress={() => void handleSaveDraft()}
          />
          <Button
            label="Continue to exam"
            testID="arrival-continue"
            style={styles.footerButton}
            loading={checking}
            onPress={() => void handleContinue()}
          />
        </View>
      }
    >
      {restoredFrom ? (
        <Banner kind="info" message="Your saved draft was restored. Edit it or continue to the exam." testID="arrival-draft-restored" />
      ) : null}
      {errorCount > 0 ? (
        <Banner
          kind="error"
          title="Check the highlighted fields"
          message={`${errorCount} ${errorCount === 1 ? 'field needs' : 'fields need'} attention before you can continue.`}
          testID="arrival-error-summary"
        />
      ) : null}

      <TextField
        label="Pet name"
        testID="arrival-name"
        placeholder="e.g. Yang Yang"
        value={details.name}
        onChangeText={(name) => update({ name })}
        error={visible.name}
        autoCapitalize="words"
        returnKeyType="next"
      />

      <SelectField
        label="Kennel / room"
        testID="arrival-kennel"
        placeholder="Select kennel / room"
        options={kennelOptions}
        value={details.kennel}
        onChange={(kennel) => update({ kennel })}
        error={visible.kennel}
        loading={kennels.isPending}
        loadError={kennels.isError ? "Couldn't load kennels." : undefined}
        onRetry={() => void kennels.refetch()}
      />

      <FormField label="Species">
        <SegmentedControl
          label="Species"
          testID="arrival-species"
          options={speciesOptions}
          value={details.species}
          onChange={(species) => update({ species })}
        />
      </FormField>

      <SelectField
        label="Country of origin"
        testID="arrival-country"
        placeholder="Select country"
        options={countryOptions}
        value={details.countryCode}
        onChange={(countryCode) => update({ countryCode })}
        error={visible.countryCode}
        loading={countries.isPending}
        loadError={countries.isError ? "Couldn't load countries." : undefined}
        onRetry={() => void countries.refetch()}
      />

      <TextField
        label="Microchip no."
        testID="arrival-microchip"
        placeholder={`${MICROCHIP_LENGTH}-digit number`}
        value={details.microchip}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={MICROCHIP_LENGTH}
        onChangeText={(text) => {
          setChipTaken(false);
          checkedChip.current = null;
          update({ microchip: text.replace(/\D/g, '') });
        }}
        onBlur={() => void checkMicrochip(details.microchip)}
        error={chipError}
        helper="Must be unique across active stays."
        accessory={
          <Button
            label="Scan"
            icon="scan-outline"
            variant="secondary"
            testID="arrival-scan"
            accessibilityHint="Scan the microchip with the camera"
            onPress={() =>
              // Scanning needs camera access and a scanner module, neither of which is wired yet.
              toast.show('Microchip scanning is not available yet. Please type the number.', 'info')
            }
          />
        }
      />

      <FormField label="Sex" error={visible.sex}>
        <SegmentedControl
          label="Sex"
          testID="arrival-sex"
          options={sexOptions}
          value={details.sex}
          onChange={(sex) => update({ sex })}
        />
      </FormField>

      <View style={styles.dates}>
        <View style={styles.dateField}>
          <TextField
            label="Date of birth"
            testID="arrival-dob"
            placeholder="DD/MM/YYYY"
            optional
            value={details.dateOfBirth}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={10}
            onChangeText={(text) => update({ dateOfBirth: formatDateInput(text) })}
            error={visible.dateOfBirth}
          />
        </View>
        <View style={styles.dateField}>
          <TextField
            label="Release date"
            testID="arrival-release"
            placeholder="DD/MM/YYYY"
            optional
            value={details.releaseDate}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={10}
            onChangeText={(text) => update({ releaseDate: formatDateInput(text) })}
            error={visible.releaseDate}
          />
        </View>
      </View>

      <View style={styles.draftStatus} accessibilityLiveRegion="polite" testID="arrival-draft-status">
        <Icon
          name={autosave.status === 'error' ? 'alert-circle-outline' : 'checkmark'}
          size="sm"
          color={autosave.status === 'error' ? theme.colors.danger : theme.colors.textMuted}
        />
        <AppText variant="caption" tone={autosave.status === 'error' ? 'danger' : 'muted'}>
          {draftLabel}
        </AppText>
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', gap: theme.spacing.md },
  footerButton: { flex: 1 },
  dates: { flexDirection: 'row', gap: theme.spacing.md, flexWrap: 'wrap' },
  dateField: { flex: 1, minWidth: theme.control.thumb * 2 },
  draftStatus: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
});
