import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components';
import { AnimalProfileScreen } from '@/features/animals/AnimalProfileScreen';
import { CaseDetailScreen } from '@/features/cases/CaseDetailScreen';
import { CasesScreen } from '@/features/cases/CasesScreen';
import { DailyInspectionScreen } from '@/features/inspections/DailyInspectionScreen';
import { createDefaultInspection, submitInspection } from '@/features/inspections/inspectionApi';
import { MedicationScreen } from '@/features/medication/MedicationScreen';
import { ConfirmObservationScreen } from '@/features/observations/ConfirmObservationScreen';
import { NewObservationScreen } from '@/features/observations/NewObservationScreen';
import { submitObservation } from '@/features/observations/observationApi';
import { ReviewQueueScreen } from '@/features/observations/ReviewQueueScreen';
import { SyncScreen } from '@/features/sync/SyncScreen';
import { mockDb, resetMockDb } from '@/mock/db';
import { setOnline } from '@/mock/sync';
import { formatTime, todayIso } from '@/utils/dates';

const mockRouter = {
  navigate: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  canGoBack: jest.fn(() => true),
};
let mockRole: 'officer' | 'contractor' = 'officer';

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  Redirect: ({ href }: { href: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native') as typeof import('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
}));
jest.mock('@/auth', () => ({
  useSession: () => ({ role: mockRole, session: { name: 'Test Officer', userId: 'user-1' } }),
  useActor: () => ({ id: 'user-1', name: 'Test Officer', role: mockRole }),
}));

function renderScreen(ui: ReactElement) {
  // gcTime Infinity: no cache timers left behind after the test.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <QueryClientProvider client={client}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  resetMockDb();
  mockRole = 'officer';
  jest.clearAllMocks();
});

describe('Daily Inspection (wireframe 09, FE-009)', () => {
  it('defaults to Normal, submits in one tap and moves to the next due animal', async () => {
    renderScreen(<DailyInspectionScreen />);
    fireEvent.press(await screen.findByTestId('inspection-session-AM'));
    expect(await screen.findByText('KC2-3 · Mochi')).toBeTruthy();
    expect(screen.getByTestId('inspection-skin-normal').props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId('inspection-progress')).toHaveTextContent('3 of 8 left');
    expect(screen.getByTestId('inspection-submit')).toHaveTextContent('Submit & next: KC2-5 Luna');

    fireEvent.press(screen.getByTestId('inspection-submit'));
    expect(await screen.findByText('KC2-5 · Luna')).toBeTruthy();
    expect(await screen.findByTestId('toast')).toHaveTextContent(/AM inspection saved for KC2-3 Mochi\./);
    expect(mockDb.inspections.at(-1)).toMatchObject({ animalId: 'animal-3', session: 'AM', recordedBy: 'Test Officer' });
  });

  it('flags abnormal items inline and before submit', async () => {
    renderScreen(<DailyInspectionScreen />);
    fireEvent.press(await screen.findByTestId('inspection-session-AM'));
    await screen.findByText('KC2-3 · Mochi');
    fireEvent.press(screen.getByTestId('inspection-stool-Watery'));
    expect(screen.getByText('Abnormal · sent for AI routing')).toBeTruthy();
    expect(screen.getByTestId('inspection-abnormal')).toHaveTextContent(/Stool: Watery/);
  });
});

describe('New Health Observation (wireframe 11, FE-010)', () => {
  it('needs a description, then opens the AI result', async () => {
    renderScreen(<NewObservationScreen />);
    fireEvent.press(screen.getByTestId('observation-submit'));
    expect(await screen.findByText(/Describe what you saw/)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('observation-text'), 'KC2-3 Mochi vomited after breakfast');
    fireEvent.press(screen.getByTestId('observation-submit'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/observation/[id]', params: { id: expect.any(String) } }));
  });
});

describe('Confirm AI routing (wireframe 12, FE-012)', () => {
  it('shows the match, signs and suggestion, then routes to the case', async () => {
    renderScreen(<ConfirmObservationScreen observationId="obs-104" />);
    expect(await screen.findByTestId('confirm-confidence')).toHaveTextContent('94%');
    expect(screen.getByText('High confidence')).toBeTruthy();
    expect(screen.getByTestId('confirm-ready')).toHaveTextContent(/AI analysis ready · 9 s.*Observation O-104/);
    expect(screen.getByText('KC2-2 · Yang Yang')).toBeTruthy();
    expect(screen.getByLabelText(/^Soft stool, GI · onset/)).toBeTruthy();
    const suggested = await screen.findByTestId('confirm-routing-update-case');
    expect(suggested.props.accessibilityState.checked).toBe(true);
    expect(suggested).toHaveTextContent(/C-2026-0142/);

    fireEvent.press(screen.getByTestId('confirm-route'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/case/[id]', params: { id: 'C-2026-0142' } }));
    // Nothing else awaits confirmation for the case, so it is no longer flagged for review.
    expect(mockDb.cases.find((c) => c.id === 'C-2026-0142')?.status).toBe('open');
  });

  it('flags low confidence as Review required and disables Confirm until corrected', async () => {
    renderScreen(<ConfirmObservationScreen observationId="obs-402" />);
    expect(await screen.findByTestId('confirm-review-required')).toHaveTextContent(/Review required · 58% match/);
    expect(screen.getByText('Low confidence')).toBeTruthy();
    expect(screen.getByTestId('confirm-route').props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getByTestId('confirm-match-correct'));
    await waitFor(() => expect(screen.getByTestId('confirm-route').props.accessibilityState.disabled).toBe(false));
    expect(screen.queryByTestId('confirm-review-required')).toBeNull();
  });

  it('FE-018: an observation saved offline waits on the device before AI analysis', async () => {
    setOnline(false);
    const observation = await submitObservation({ animalId: null, text: 'KC2-3 Mochi sneezing', media: [], actor: { id: 'user-1', name: 'Test Officer', role: 'officer' } });
    renderScreen(<ConfirmObservationScreen observationId={observation.id} />);
    expect(await screen.findByText('Saved on this device')).toBeTruthy();
    expect(mockDb.outbox.map((e) => e.recordId)).toContain(observation.id);
  });
});

describe('Animal Profile (wireframe 07, FE-014)', () => {
  it('shows today, cited AI statements, the open case and a filterable health record', async () => {
    renderScreen(<AnimalProfileScreen animalId="animal-2" />);
    expect(await screen.findByText('Yang Yang')).toBeTruthy();
    expect(screen.getByTestId('profile-status')).toHaveTextContent('Unwell · monitoring');
    expect(screen.getByTestId('profile-summary')).toHaveTextContent(/GI upset since/);

    // FE-014: tapping a citation opens the source record.
    const [firstCitation] = screen.getAllByTestId(/^citation-/);
    if (!firstCitation) throw new Error('Expected at least one citation');
    fireEvent.press(firstCitation);
    expect(await screen.findByTestId('record-sheet')).toBeTruthy();

    fireEvent.press(screen.getByTestId('profile-case-C-2026-0142'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/case/[id]', params: { id: 'C-2026-0142' } });

    fireEvent.press(screen.getByTestId('record-filter-medication'));
    const list = screen.getByTestId('record-list');
    expect(within(list).queryByText('AM inspection')).toBeNull();
    expect(within(list).getAllByText(/given$/).length).toBeGreaterThan(0);

    fireEvent.press(screen.getByTestId('profile-inspect'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/inspect/[animalId]', params: { animalId: 'animal-2' } });
  });
});

describe('Medication (wireframe 10, FE-013)', () => {
  it('records a due dose from the sheet with time and officer captured automatically', async () => {
    const today = todayIso();
    const time = formatTime(Date.now());
    mockDb.schedules.push({ id: 'med-now', animalId: 'animal-3', item: 'Vitamin paste', dose: '2 g', times: [time], startDate: today, endDate: today });
    renderScreen(<MedicationScreen animalId="animal-3" />);
    fireEvent.press(await screen.findByTestId(`dose-record-${today}T${time}`));
    const summary = await screen.findByTestId('record-summary');
    expect(summary).toHaveTextContent(/Vitamin paste 2 g/);
    expect(summary).toHaveTextContent(/Test Officer\s*auto/);
    fireEvent.changeText(screen.getByTestId('record-remarks'), 'With food');
    fireEvent.press(screen.getByTestId('record-confirm'));
    await waitFor(() => expect(mockDb.administrations.at(-1)).toMatchObject({ scheduleId: 'med-now', by: 'Test Officer', remarks: 'With food' }));
    expect(await screen.findByTestId(`given-${today}T${time}`)).toBeTruthy();
  });
});

describe('Health Cases (wireframes 13 and 14, FE-015 / FE-016)', () => {
  it('FE-015: Open is selected by default with counts; removing it shows closed cases too', async () => {
    renderScreen(<CasesScreen />);
    expect(await screen.findByTestId('case-row-C-2026-0142')).toBeTruthy();
    expect(screen.getByTestId('cases-filter-open')).toHaveTextContent(/^Open\s*3$/);
    expect(screen.getByTestId('cases-filter-review')).toHaveTextContent(/^Needs review\s*1$/);
    expect(screen.queryByTestId('case-row-C-2026-0107')).toBeNull();
    fireEvent.press(screen.getByTestId('cases-filter-open'));
    expect(await screen.findByTestId('case-row-C-2026-0107')).toBeTruthy();
    fireEvent.press(screen.getByTestId('case-row-C-2026-0138'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/case/[id]', params: { id: 'C-2026-0138' } });
  });

  it('FE-016: closing requires a reason', async () => {
    renderScreen(<CaseDetailScreen caseId="C-2026-0138" />);
    fireEvent.press(await screen.findByTestId('case-close'));
    fireEvent.press(await screen.findByTestId('close-confirm'));
    expect(await screen.findByTestId('close-reason-error')).toBeTruthy();
    expect(mockDb.cases.find((c) => c.id === 'C-2026-0138')?.status).toBe('open');

    fireEvent.press(screen.getByTestId('close-reason-Resolved'));
    fireEvent.press(screen.getByTestId('close-confirm'));
    await waitFor(() => expect(mockDb.cases.find((c) => c.id === 'C-2026-0138')?.status).toBe('closed'));
  });

  it('FE-016: posts a note to the case', async () => {
    renderScreen(<CaseDetailScreen caseId="C-2026-0138" />);
    fireEvent.changeText(await screen.findByTestId('case-note'), 'Ate most of his lunch');
    fireEvent.press(screen.getByTestId('case-save-note'));
    expect(await screen.findByText('Ate most of his lunch')).toBeTruthy();
  });

  it('FE-004: contractors cannot close cases', async () => {
    mockRole = 'contractor';
    renderScreen(<CaseDetailScreen caseId="C-2026-0138" />);
    expect(await screen.findByTestId('case-save-note')).toBeTruthy();
    expect(screen.queryByTestId('case-close')).toBeNull();
  });
});

describe('Review queue (wireframe 04, FE-017)', () => {
  it('lists unmatched, low-confidence and AI-unavailable items and triages inline', async () => {
    renderScreen(<ReviewQueueScreen />);
    expect(await screen.findByTestId('review-count')).toHaveTextContent('4 to triage');
    expect(screen.getByText('No animal match')).toBeTruthy();
    expect(screen.getByText('Low confidence · 58%')).toBeTruthy();
    expect(screen.getByText('AI unavailable')).toBeTruthy();

    // The first (unmatched) item is open: pick an AI candidate, choose the action, confirm.
    fireEvent.press(screen.getByTestId('review-obs-401-candidate-animal-4'));
    fireEvent.press(await screen.findByTestId('review-obs-401-routing-new-case'));
    fireEvent.press(screen.getByTestId('review-obs-401-confirm'));
    await waitFor(() => expect(screen.getByTestId('review-count')).toHaveTextContent('3 to triage'));
    expect(mockDb.observations.find((o) => o.id === 'obs-401')?.routing).toMatchObject({ animalId: 'animal-4', action: 'new-case' });
  });

  it('redirects contractors', () => {
    mockRole = 'contractor';
    renderScreen(<ReviewQueueScreen />);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/');
  });
});

describe('Pending sync (wireframe 15, FE-018)', () => {
  it('lists records saved offline and sends them in order when back online', async () => {
    setOnline(false);
    await submitInspection({ animalId: 'animal-3', session: 'AM', input: createDefaultInspection(), actor: { id: 'user-1', name: 'Test Officer', role: 'officer' } });
    renderScreen(<SyncScreen />);
    expect(await screen.findByTestId('sync-offline-bar')).toHaveTextContent(/offline\. 1 record saved/);
    expect(screen.getByText('AM inspection · KC2-3 Mochi')).toBeTruthy();
    expect(screen.getByTestId('sync-now').props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByTestId('sync-work-offline'));
    expect(await screen.findByTestId('sync-empty', {}, { timeout: 3000 })).toBeTruthy();
    expect(mockDb.outbox).toHaveLength(0);
  });
});
