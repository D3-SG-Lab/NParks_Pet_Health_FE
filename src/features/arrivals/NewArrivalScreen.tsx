import { Redirect, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { failureMessage } from '@/api';
import { useSession } from '@/auth';
import {
  AppText,
  Banner,
  Button,
  Card,
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
import { SEXES, type ArrivalDetailsInput, type Sex } from '@/domain/types';
import { useGoBack } from '@/navigation/useGoBack';
import { theme } from '@/theme';
import { formatDateInput } from '@/utils/dates';

import { ArrivalError, isMicrochipTaken } from './arrivalApi';
import {
  useArrivalDraft,
  useCountries,
  useKennelOptions,
  useRegisterArrival,
  useSaveArrivalDraft,
  useSpecies,
} from './hooks';
import { useAutosave } from './useAutosave';
import { EMPTY_DETAILS, MICROCHIP_LENGTH, hasErrors, validateDetails, validateMicrochipFormat } from './validation';

const TOTAL_STEPS = 2;

/** Up to this many species fit the segmented control (C3); more use a picker. */
const MAX_SPECIES_SEGMENTS = 4;
const sexOptions: readonly SegmentOption<Sex>[] = SEXES.map((value) => ({ value, label: value }));

/** Screen 5: New Arrival, step 1 of 2. Officers only (contractors do not see New Arrival). */
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
  const species = useSpecies();
  const saveDraft = useSaveArrivalDraft();
  const register = useRegisterArrival();

  const [details, setDetails] = useState<ArrivalDetailsInput>(initial);
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [chipTaken, setChipTaken] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkedChip = useRef<string | null>(null);

  const autosave = useAutosave(details, dirty, (value) => saveDraft.mutateAsync({ details: value }));

  const errors = useMemo(() => validateDetails(details), [details]);
  const visible = showErrors ? errors : {};
  // The species must be one of the current list (a restored draft may hold one that was since deactivated).
  const speciesInvalid = !species.data?.includes(details.species);
  const speciesError = showErrors && species.isSuccess && speciesInvalid ? 'Select a species.' : undefined;
  const chipError = visible.microchip ?? (chipTaken ? 'This microchip number is already registered to an active stay.' : undefined);

  const kennelOptions: SelectOption[] = (kennels.data ?? []).map((kennel) => ({
    value: kennel.code,
    label: kennel.code,
    description: kennel.occupant ? `Currently: ${kennel.occupant}` : 'Empty',
  }));
  const speciesOptions: SelectOption[] = (species.data ?? []).map((name) => ({ value: name, label: name }));
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

  // The draft autosaves; leaving flushes the latest edits first so nothing typed is lost.
  const handleBack = async () => {
    try {
      if (dirty) {
        await autosave.flush();
        toast.show('Draft saved. Continue it later from New Arrival.', 'success');
      }
    } catch {
      toast.show("Couldn't save the draft. It will be retried when you return.", 'error');
    }
    goBack();
  };

  const handleContinue = async () => {
    setShowErrors(true);
    if (hasErrors(errors) || speciesInvalid) return;
    try {
      if (await checkMicrochip(details.microchip)) return;
    } catch (error) {
      toast.show(failureMessage(error, "Couldn't check the microchip number. Please try again."), 'error');
      return;
    }
    try {
      await autosave.flush();
    } catch {
      toast.show("Couldn't save the draft. Please try again.", 'error');
      return;
    }
    // With the backend on, this registers the stay (POST /animals); the exam is then saved against it.
    try {
      await register.mutateAsync(details);
    } catch (error) {
      if (error instanceof ArrivalError && error.kind === 'microchip_taken') {
        checkedChip.current = details.microchip;
        setChipTaken(true);
        return;
      }
      const message = error instanceof ArrivalError ? error.message : failureMessage(error, "Couldn't register the arrival. Please try again.");
      toast.show(message, 'error');
      return;
    }
    router.navigate('/arrival-exam');
  };

  const errorCount = Object.keys(visible).length + (chipTaken && !visible.microchip ? 1 : 0) + (speciesError ? 1 : 0);
  const draftLabel =
    autosave.status === 'saving'
      ? 'Saving…'
      : autosave.status === 'error'
        ? 'Not saved'
        : autosave.status === 'saved' || restoredFrom
          ? 'Draft saved'
          : 'Autosaves';

  return (
    <PageLayout
      header={
        <ScreenHeader
          title="New Arrival"
          onBack={() => void handleBack()}
          backLabel="Save draft and go back to Operations"
          trailing={
            <View style={styles.draftStatus} accessibilityLiveRegion="polite" testID="arrival-draft-status">
              {autosave.status === 'saving' ? null : (
                <Icon
                  name={autosave.status === 'error' ? 'alert-circle-outline' : 'cloud-done-outline'}
                  size="sm"
                  color={autosave.status === 'error' ? theme.colors.danger : autosave.status === 'idle' && !restoredFrom ? theme.colors.text3 : theme.colors.success}
                />
              )}
              <AppText variant="label" tone={autosave.status === 'error' ? 'danger' : autosave.status === 'idle' && !restoredFrom ? 'subtle' : 'success'}>
                {draftLabel}
              </AppText>
            </View>
          }
          below={<StepProgress step={1} total={TOTAL_STEPS} label={`Step 1 of ${TOTAL_STEPS} · Animal details`} aside="Next: Arrival exam" />}
        />
      }
      footer={
        <>
          <Button
            label="Continue to arrival exam"
            testID="arrival-continue"
            loading={checking || register.isPending}
            loadingLabel={checking ? 'Checking microchip' : 'Registering arrival'}
            onPress={() => void handleContinue()}
          />
          {errorCount > 0 ? (
            <AppText variant="bodyS" tone="muted" center accessibilityLiveRegion="polite" testID="arrival-error-summary">
              {`Fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} to continue`}
            </AppText>
          ) : null}
        </>
      }
    >
      {restoredFrom ? (
        <Banner kind="info" message="Your saved draft was restored. Edit it or continue to the exam." testID="arrival-draft-restored" />
      ) : null}

      <Card padded={false}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Icon name="paw-outline" size="sm" color={theme.colors.primary} />
          </View>
          <AppText variant="titleS" accessibilityRole="header" style={styles.flex}>
            Animal details
          </AppText>
          <AppText variant="caption" tone="subtle">
            <AppText variant="caption" tone="danger">
              *
            </AppText>
            {' required'}
          </AppText>
        </View>

        <View style={styles.fields}>
          <TextField
            label="Pet name"
            required
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
            required
            mono
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

          {species.isSuccess && speciesOptions.length <= MAX_SPECIES_SEGMENTS ? (
            <FormField label="Species" required error={speciesError}>
              <SegmentedControl
                label="Species"
                testID="arrival-species"
                options={speciesOptions}
                value={details.species}
                onChange={(value) => update({ species: value })}
              />
            </FormField>
          ) : (
            <SelectField
              label="Species"
              required
              testID="arrival-species"
              placeholder="Select species"
              options={speciesOptions}
              value={details.species || null}
              onChange={(value) => update({ species: value })}
              error={speciesError}
              loading={species.isPending}
              loadError={species.isError ? "Couldn't load species." : undefined}
              onRetry={() => void species.refetch()}
            />
          )}

          <SelectField
            label="Country of origin"
            required
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
            required
            mono
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
            // A failed check here is retried, and reported, on Continue.
            onBlur={() => void checkMicrochip(details.microchip).catch(() => {})}
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

          <FormField label="Sex" required error={visible.sex}>
            <SegmentedControl label="Sex" testID="arrival-sex" options={sexOptions} value={details.sex} onChange={(sex) => update({ sex })} />
          </FormField>

          <View style={styles.dates}>
            <View style={styles.dateField}>
              <TextField
                label="Date of birth"
                testID="arrival-dob"
                placeholder="DD/MM/YYYY"
                value={details.dateOfBirth}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={10}
                onChangeText={(text) => update({ dateOfBirth: formatDateInput(text) })}
                error={visible.dateOfBirth}
                trailingIcon={<Icon name="calendar-outline" size="sm" color={theme.colors.text2} />}
              />
            </View>
            <View style={styles.dateField}>
              <TextField
                label="Release date"
                testID="arrival-release"
                placeholder="DD/MM/YYYY"
                required
                value={details.releaseDate}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={10}
                onChangeText={(text) => update({ releaseDate: formatDateInput(text) })}
                error={visible.releaseDate}
                trailingIcon={<Icon name="calendar-outline" size="sm" color={theme.colors.text2} />}
              />
            </View>
          </View>
        </View>
      </Card>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
    padding: theme.spacing.s4,
    borderBottomWidth: theme.control.borderWidth,
    borderBottomColor: theme.colors.line,
  },
  cardIcon: {
    width: theme.control.iconBadge,
    height: theme.control.iconBadge,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  fields: { padding: theme.spacing.s4, gap: theme.spacing.s5 },
  // Side by side on phones; stacked only when large text makes each column too narrow.
  dates: { flexDirection: 'row', gap: theme.spacing.s3, flexWrap: 'wrap' },
  dateField: { flex: 1, minWidth: 140 },
  draftStatus: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s1 },
});
