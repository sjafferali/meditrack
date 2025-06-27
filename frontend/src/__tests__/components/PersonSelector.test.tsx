import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PersonSelector from '../../components/PersonSelector';
import { personApi } from '../../services/api';

// Mock the API module
jest.mock('../../services/api');

describe('PersonSelector', () => {
  const mockPersons = [
    { id: 1, name: 'John Doe', is_default: true, medication_count: 3 },
    { id: 2, name: 'Jane Smith', is_default: false, medication_count: 1 },
    { id: 3, name: 'Bob Johnson', is_default: false, medication_count: 0 }
  ];

  const mockOnPersonChange = jest.fn();
  const mockOnManagePersons = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (personApi.getAll as jest.Mock).mockResolvedValue(mockPersons);
  });

  test('renders loading state initially', async () => {
    render(
      <PersonSelector
        currentPersonId={null}
        onPersonChange={mockOnPersonChange}
        onManagePersons={mockOnManagePersons}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Wait for API call to complete to avoid act() warning
    await waitFor(() => {
      expect(personApi.getAll).toHaveBeenCalled();
    });
  });

  test('renders person selector after loading', async () => {
    render(
      <PersonSelector
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
        onManagePersons={mockOnManagePersons}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  test('handles error state', async () => {
    const errorMessage = 'Failed to load persons';
    (personApi.getAll as jest.Mock).mockRejectedValue(new Error(errorMessage));

    render(
      <PersonSelector
        currentPersonId={null}
        onPersonChange={mockOnPersonChange}
        onManagePersons={mockOnManagePersons}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  test('opens dropdown when clicked', async () => {
    render(
      <PersonSelector
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
        onManagePersons={mockOnManagePersons}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const selectorButton = screen.getByText('John Doe');
    fireEvent.click(selectorButton);

    // All persons should be visible in the dropdown
    await screen.findByText('Jane Smith');
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  test('displays medication count for each person', async () => {
    render(
      <PersonSelector
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
        onManagePersons={mockOnManagePersons}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const selectorButton = screen.getByText('John Doe');
    fireEvent.click(selectorButton);

    await screen.findByText('3 medications');
    expect(screen.getByText('1 medication')).toBeInTheDocument();
    expect(screen.getByText('0 medications')).toBeInTheDocument();
  });

  test('displays default badge for default person', async () => {
    render(
      <PersonSelector
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
        onManagePersons={mockOnManagePersons}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const selectorButton = screen.getByText('John Doe');
    fireEvent.click(selectorButton);

    await waitFor(() => {
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  test('calls onPersonChange when person is selected', async () => {
    render(
      <PersonSelector
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
        onManagePersons={mockOnManagePersons}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const selectorButton = screen.getByText('John Doe');
    fireEvent.click(selectorButton);

    const janeSmithButton = await screen.findByText('Jane Smith');
    fireEvent.click(janeSmithButton);

    expect(mockOnPersonChange).toHaveBeenCalledWith(2);
  });

  test('calls onManagePersons when Manage People is clicked', async () => {
    render(
      <PersonSelector
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
        onManagePersons={mockOnManagePersons}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const selectorButton = screen.getByText('John Doe');
    fireEvent.click(selectorButton);

    const manageButton = await screen.findByText('Manage People');
    fireEvent.click(manageButton);

    expect(mockOnManagePersons).toHaveBeenCalled();
  });

  test('closes dropdown when clicking outside', async () => {
    render(
      <PersonSelector
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
        onManagePersons={mockOnManagePersons}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const selectorButton = screen.getByText('John Doe');
    fireEvent.click(selectorButton);

    // Dropdown should be open
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Click on backdrop to close modal (find by test ID)
    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  test('selects default person when no currentPersonId', async () => {
    render(
      <PersonSelector
        currentPersonId={null}
        onPersonChange={mockOnPersonChange}
        onManagePersons={mockOnManagePersons}
      />
    );

    await waitFor(() => {
      // Should automatically select the default person
      expect(mockOnPersonChange).toHaveBeenCalledWith(1);
    });
  });
});