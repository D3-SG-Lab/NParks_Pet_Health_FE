import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components';
import { ArrivalExamScreen } from '@/features/arrivals/ArrivalExamScreen';
import { saveArrivalDraft } from '@/features/arrivals/arrivalApi';
import { NewArrivalScreen } from '@/features/arrivals/NewArrivalScreen';
import { OperationsScreen } from '@/features/operations/OperationsScreen';
import { mockDb, resetMockDb } from '@/mock/db';

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
  useSession: () => ({
    role: mockRole,
    session: { name: 'Aisha Rahman' },
    signOut: jest.fn(async () => undefined),
  }),
}));

function renderWithProviders(ui: ReactElement, client = new QueryClient({ defaultOptions: { // gcTime Infinity: no 5 minute cache timers, so Jest can exit as soon as the tests finish.
    queries: { retry: false, gcTime: Infinity } } })) {
  return {
    client,
    ...render(
      <SafeAreaProvider
        initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
      >
        <QueryClientProvider client={client}>
          <ToastProvider>{ui}</ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>,
    ),
  };
}

async function pickOption(field: string, optionValue: string) {
  fireEvent.press(await screen.findByTestId(field));
  fireEvent.press(await screen.findByTestId(`${field}-option-${optionValue}`));
}

beforeEach(() => {
  resetMockDb();
  mockRole = 'officer';
  jest.clearAllMocks();
});

describe('Operations (wireframe 01)', () => {
  it('shows counts and alerts from the shared mock data', async () => {
    renderWithProviders(<OperationsScreen />);
    expect(await screen.findByTestId('stat-active-pets')).toHaveTextContent(/^8/);
    expect(screen.getByTestId('stat-checks-due')).toHaveTextContent(/^3/);
    expect(screen.getByTestId('stat-open-cases')).toHaveTextContent(/^3/);
    expect(screen.getByText('3 observations need manual review')).toBeTruthy();
    expect(screen.getByText('KC2-2 Yang Yang')).toBeTruthy();
    expect(screen.getByText('GI observation requires review')).toBeTruthy();
    expect(screen.getByText(/, Aisha Rahman$/)).toBeTruthy();
  });

  it('New Arrival opens the arrival flow; alerts open Cases', async () => {
    renderWithProviders(<OperationsScreen />);
    fireEvent.press(screen.getByTestId('operations-new-arrival'));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/new-arrival');
    fireEvent.press(await screen.findByTestId('alert-alert-1'));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/cases');
  });

  it('out-of-scope CTAs give feedback instead of doing nothing', async () => {
    renderWithProviders(<OperationsScreen />);
    fireEvent.press(screen.getByTestId('operations-new-observation'));
    expect(await screen.findByTestId('toast')).toHaveTextContent(/not available yet/);
  });

  it('hides New Arrival from contractors', async () => {
    mockRole = 'contractor';
    renderWithProviders(<OperationsScreen />);
    await screen.findByTestId('stat-active-pets');
    expect(screen.queryByTestId('operations-new-arrival')).toBeNull();
    expect(screen.getByTestId('operations-new-observation')).toBeTruthy();
  });
});

describe('New Arrival (wireframe 02)', () => {
  it('redirects contractors away', () => {
    mockRole = 'contractor';
    renderWithProviders(<NewArrivalScreen />);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/');
  });

  it('blocks Continue and lists problems when the form is empty', async () => {
    renderWithProviders(<NewArrivalScreen />);
    fireEvent.press(await screen.findByTestId('arrival-continue'));
    expect(await screen.findByTestId('arrival-error-summary')).toBeTruthy();
    expect(screen.getByText('Enter the pet name.')).toBeTruthy();
    expect(screen.getByText('Select a kennel / room.')).toBeTruthy();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('rejects a microchip that is already registered to an active stay', async () => {
    renderWithProviders(<NewArrivalScreen />);
    fireEvent.changeText(await screen.findByTestId('arrival-name'), 'Nala');
    await pickOption('arrival-kennel', 'KC2-7');
    await pickOption('arrival-country', 'JP');
    fireEvent.press(screen.getByTestId('arrival-sex-Female'));
    fireEvent.changeText(screen.getByTestId('arrival-microchip'), '982000123450002');
    fireEvent.press(screen.getByTestId('arrival-continue'));
    expect(await screen.findByText('This microchip number is already registered to an active stay.')).toBeTruthy();
    expect(mockRouter.navigate).not.toHaveBeenCalledWith('/arrival-exam');
  });

  it('continues to the exam with valid details and keeps them as a draft', async () => {
    renderWithProviders(<NewArrivalScreen />);
    fireEvent.changeText(await screen.findByTestId('arrival-name'), 'Nala');
    await pickOption('arrival-kennel', 'KC2-7');
    await pickOption('arrival-country', 'JP');
    fireEvent.press(screen.getByTestId('arrival-sex-Female'));
    fireEvent.changeText(screen.getByTestId('arrival-microchip'), '982000999999991');
    fireEvent.changeText(screen.getByTestId('arrival-dob'), '05042023');
    expect(screen.getByTestId('arrival-dob').props.value).toBe('05/04/2023');
    fireEvent.press(screen.getByTestId('arrival-continue'));
    await waitFor(() => expect(mockRouter.navigate).toHaveBeenCalledWith('/arrival-exam'));
    expect(mockDb.draft?.details).toMatchObject({ name: 'Nala', kennel: 'KC2-7', countryCode: 'JP', sex: 'Female' });
  });

  it('Save draft stores the form and returns to Operations', async () => {
    renderWithProviders(<NewArrivalScreen />);
    fireEvent.changeText(await screen.findByTestId('arrival-name'), 'Half done');
    fireEvent.press(screen.getByTestId('arrival-save-draft'));
    await waitFor(() => expect(mockRouter.navigate).toHaveBeenCalledWith('/'));
    expect(mockDb.draft?.details.name).toBe('Half done');
  });

  it('Scan explains that scanning is unavailable', async () => {
    renderWithProviders(<NewArrivalScreen />);
    fireEvent.press(await screen.findByTestId('arrival-scan'));
    expect(await screen.findByTestId('toast')).toHaveTextContent(/not available/);
  });
});

describe('Arrival Exam (wireframe 03)', () => {
  const details = {
    name: 'Nala',
    kennel: 'KC2-7',
    species: 'Cat' as const,
    countryCode: 'JP',
    microchip: '982000999999991',
    sex: 'Female' as const,
    dateOfBirth: '',
    releaseDate: '',
  };

  it('shows a way back when there is no arrival in progress', async () => {
    renderWithProviders(<ArrivalExamScreen />);
    expect(await screen.findByTestId('exam-missing-arrival')).toBeTruthy();
    fireEvent.press(screen.getByTestId('exam-go-arrival'));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/new-arrival');
  });

  it('requires vet, weight and a note for Abnormal findings', async () => {
    await saveArrivalDraft({ details });
    renderWithProviders(<ArrivalExamScreen />);
    expect(await screen.findByTestId('exam-animal-summary')).toHaveTextContent(/KC2-7 · Cat · Female/);
    fireEvent.press(screen.getByTestId('exam-eyes-toggle-abnormal'));
    expect(screen.getByText('Note required')).toBeTruthy();
    fireEvent.press(screen.getByTestId('exam-complete'));
    expect(await screen.findByText('Select the examining vet.')).toBeTruthy();
    expect(screen.getByText('Enter the weight in kg.')).toBeTruthy();
    expect(screen.getByText('Note required. Describe the finding.')).toBeTruthy();
    expect(mockDb.animals).toHaveLength(8);
  });

  it('completes the exam, creates the animal and returns to Operations', async () => {
    await saveArrivalDraft({ details });
    const { client } = renderWithProviders(<ArrivalExamScreen />);
    await pickOption('exam-vet', 'vet-1');
    fireEvent.changeText(await screen.findByTestId('exam-weight'), '4.2');
    fireEvent.press(screen.getByTestId('exam-eyes-toggle-abnormal'));
    fireEvent.changeText(screen.getByTestId('exam-eyes-note'), 'Mild discharge, left eye');
    fireEvent.press(screen.getByTestId('exam-eyes-add-photo'));
    expect(screen.getByLabelText('Remove photo 1 from Eyes')).toBeTruthy();

    fireEvent.press(screen.getByTestId('exam-complete'));
    await waitFor(() => expect(mockRouter.navigate).toHaveBeenCalledWith('/'));

    expect(mockDb.animals).toHaveLength(9);
    expect(mockDb.exams[0]?.findings.eyes).toMatchObject({ abnormal: true, note: 'Mild discharge, left eye' });
    expect(mockDb.draft).toBeNull();
    expect(await screen.findByTestId('toast')).toHaveTextContent(/Nala is now under active monitoring in KC2-7/);
    // Operations data was invalidated so the new animal is counted.
    expect(client.getQueryState(['operations', 'summary'])?.isInvalidated ?? true).toBeTruthy();
  });

  it('shows an error and offers to fix details when the microchip was taken meanwhile', async () => {
    await saveArrivalDraft({ details: { ...details, microchip: '982000123450002' } });
    renderWithProviders(<ArrivalExamScreen />);
    await pickOption('exam-vet', 'vet-2');
    fireEvent.changeText(await screen.findByTestId('exam-weight'), '5');
    fireEvent.press(screen.getByTestId('exam-complete'));
    const banner = await screen.findByTestId('exam-chip-conflict');
    expect(within(banner).getByText('Microchip already registered')).toBeTruthy();
    fireEvent.press(screen.getByTestId('exam-edit-details'));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/new-arrival');
    await act(async () => undefined);
  });
});
