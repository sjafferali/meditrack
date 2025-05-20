import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PersonManager from '../../components/PersonManager';
import { personApi } from '../../services/api';

// The Jest config now has a 30-second default timeout

// Mock the API module
jest.mock('../../services/api');

// Tests are now optimized

describe('PersonManager', () => {
  const mockPersons = [
    { 
      id: 1, 
      name: 'John Doe', 
      date_of_birth: '1990-01-01', 
      notes: 'Primary person', 
      is_default: true, 
      medication_count: 3 
    },
    { 
      id: 2, 
      name: 'Jane Smith', 
      date_of_birth: '1985-05-15', 
      notes: 'Family member', 
      is_default: false, 
      medication_count: 1 
    }
  ];

  const mockOnClose = jest.fn();
  const mockOnPersonChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Use immediate mock implementations
    (personApi.getAll as jest.Mock).mockResolvedValue(mockPersons);
    (personApi.create as jest.Mock).mockResolvedValue({
      id: 3,
      name: 'New Person',
      is_default: false,
      medication_count: 0
    });
    (personApi.update as jest.Mock).mockResolvedValue({
      ...mockPersons[0],
      name: 'Updated Name'
    });
    (personApi.delete as jest.Mock).mockResolvedValue({});
    (personApi.setDefault as jest.Mock).mockResolvedValue({
      ...mockPersons[1],
      is_default: true
    });
  });

  test('does not render when closed', async () => {
    await act(async () => {
      render(
        <PersonManager
          isOpen={false}
          onClose={mockOnClose}
          currentPersonId={1}
          onPersonChange={mockOnPersonChange}
        />
      );
    });

    expect(screen.queryByText('Select a Person')).not.toBeInTheDocument();
  });

  test('renders modal when open', async () => {
    await act(async () => {
      render(
        <PersonManager
          isOpen={true}
          onClose={mockOnClose}
          currentPersonId={1}
          onPersonChange={mockOnPersonChange}
        />
      );
    });

    expect(screen.getByText('Select a Person')).toBeInTheDocument();
    // Wait for async loading to complete to avoid act() warnings
    await waitFor(() => {
      expect(personApi.getAll).toHaveBeenCalled();
    });
  });

  test('displays loading state initially', async () => {
    // Mock the API to delay returning data
    (personApi.getAll as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockPersons), 500))
    );
    
    render(
      <PersonManager
        isOpen={true}
        onClose={mockOnClose}
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
      />
    );

    // With the delayed API response, we can now catch the loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Wait for it to finish loading
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  test('displays persons after loading', async () => {
    // Use act to properly handle the async state updates
    await act(async () => {
      render(
        <PersonManager
          isOpen={true}
          onClose={mockOnClose}
          currentPersonId={1}
          onPersonChange={mockOnPersonChange}
        />
      );
    });

    await screen.findByText('John Doe');
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('displays person details', async () => {
    await act(async () => {
      render(
        <PersonManager
          isOpen={true}
          onClose={mockOnClose}
          currentPersonId={1}
          onPersonChange={mockOnPersonChange}
        />
      );
    });

    // Check for the born text but be flexible about date format - use getAllByText since there are multiple persons
    const bornElements = await screen.findAllByText((content, element) => {
      return element?.tagName.toLowerCase() === 'p' && content.startsWith('Born:');
    });
    expect(bornElements.length).toBeGreaterThan(0);
    
    expect(screen.getByText('Primary person')).toBeInTheDocument();
    expect(screen.getByText('3 medications')).toBeInTheDocument();
  });

  test('handles error state', async () => {
    const errorMessage = 'Failed to load persons';
    (personApi.getAll as jest.Mock).mockRejectedValue(new Error(errorMessage));

    await act(async () => {
      render(
        <PersonManager
          isOpen={true}
          onClose={mockOnClose}
          currentPersonId={1}
          onPersonChange={mockOnPersonChange}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('closes modal when close button clicked', async () => {
    await act(async () => {
      render(
        <PersonManager
          isOpen={true}
          onClose={mockOnClose}
          currentPersonId={1}
          onPersonChange={mockOnPersonChange}
        />
      );
    });

    // Find the close button by its position in the header
    const headerButtons = screen.getAllByRole('button');
    const closeButton = headerButtons[0]; // The first button in the modal is the close button
    
    await act(async () => {
      fireEvent.click(closeButton);
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('closes modal when clicking overlay', async () => {
    await act(async () => {
      render(
        <PersonManager
          isOpen={true}
          onClose={mockOnClose}
          currentPersonId={1}
          onPersonChange={mockOnPersonChange}
        />
      );
    });

    // Wait for the modal to render
    await screen.findByText('Select a Person');
    
    // Find the overlay using data-testid
    const overlay = screen.getByTestId('modal-overlay');
    
    await act(async () => {
      fireEvent.click(overlay);
    });
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('shows add person form when Add New Person clicked', async () => {
    await act(async () => {
      render(
        <PersonManager
          isOpen={true}
          onClose={mockOnClose}
          currentPersonId={1}
          onPersonChange={mockOnPersonChange}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Add New Person')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add New Person');
    
    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(screen.getByText('Add New Person')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  test('adds new person when form submitted', async () => {
    render(
      <PersonManager
        isOpen={true}
        onClose={mockOnClose}
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
      />
    );

    // Click Add Person button
    const addButton = await screen.findByText('Add New Person');
    fireEvent.click(addButton);

    // Fill in the form
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'New Person' } });

    const dobInput = screen.getByLabelText('Date of Birth');
    fireEvent.change(dobInput, { target: { value: '2000-01-01' } });

    const notesInput = screen.getByLabelText('Notes');
    fireEvent.change(notesInput, { target: { value: 'Test notes' } });

    // Submit the form
    const submitButton = screen.getByText('Add');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(personApi.create).toHaveBeenCalledWith({
        name: 'New Person',
        date_of_birth: '2000-01-01',
        notes: 'Test notes'
      });
    });
    expect(mockOnPersonChange).toHaveBeenCalledWith(3); // New person ID
  });

  test('shows edit form when Edit clicked', async () => {
    render(
      <PersonManager
        isOpen={true}
        onClose={mockOnClose}
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Edit Person')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
  });

  test('updates person when edit form submitted', async () => {
    render(
      <PersonManager
        isOpen={true}
        onClose={mockOnClose}
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Update the name
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    // Submit the form
    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(personApi.update).toHaveBeenCalledWith(1, {
        name: 'Updated Name',
        date_of_birth: '1990-01-01',
        notes: 'Primary person'
      });
    });
  });

  test('shows delete confirmation when Delete clicked', async () => {
    render(
      <PersonManager
        isOpen={true}
        onClose={mockOnClose}
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[1]); // Delete Jane Smith

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('deletes person when confirmed', async () => {
    render(
      <PersonManager
        isOpen={true}
        onClose={mockOnClose}
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[1]); // Delete Jane Smith

    const confirmButton = screen.getByText('Confirm Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(personApi.delete).toHaveBeenCalledWith(2);
    });
  });

  test('cancels delete when Cancel clicked', async () => {
    render(
      <PersonManager
        isOpen={true}
        onClose={mockOnClose}
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[1]); // Delete Jane Smith

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Confirm and Cancel buttons should disappear
    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    expect(personApi.delete).not.toHaveBeenCalled();
  });

  test('sets person as default when Set as Default clicked', async () => {
    render(
      <PersonManager
        isOpen={true}
        onClose={mockOnClose}
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const setDefaultButton = screen.getByText('Set as Default');
    fireEvent.click(setDefaultButton);

    await waitFor(() => {
      expect(personApi.setDefault).toHaveBeenCalledWith(2);
    });
  });

  test('disables delete for last person', async () => {
    // Mock only one person
    (personApi.getAll as jest.Mock).mockResolvedValue([mockPersons[0]]);

    render(
      <PersonManager
        isOpen={true}
        onClose={mockOnClose}
        currentPersonId={1}
        onPersonChange={mockOnPersonChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute('title', 'Cannot delete the last person');
  });

  test('switches to another person after deleting current', async () => {
    render(
      <PersonManager
        isOpen={true}
        onClose={mockOnClose}
        currentPersonId={2}
        onPersonChange={mockOnPersonChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[1]); // Delete Jane Smith (current person)

    const confirmButton = screen.getByText('Confirm Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => expect(personApi.delete).toHaveBeenCalledWith(2));
    expect(mockOnPersonChange).toHaveBeenCalledWith(1); // Switch to John Doe
  });
});