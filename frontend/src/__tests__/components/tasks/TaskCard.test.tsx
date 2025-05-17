import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from '@/components/tasks/TaskCard';

// Mock task data
const mockTask = {
  id: '123',
  name: 'Test Task',
  description: 'This is a test task',
  category: 'Frontend',
  priority: 'high',
  estimate: '2 days',
  dependencies: ['456', '789'],
  notes: 'Some notes about the task',
};

// Mock callback functions
const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();
const mockOnPriorityChange = jest.fn();

describe('TaskCard component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });
  
  it('should render task name and metadata', () => {
    render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPriorityChange={mockOnPriorityChange}
      />
    );
    
    // Check if task name is rendered
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    
    // Check if category is rendered
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    
    // Check if priority is rendered
    expect(screen.getByText('high')).toBeInTheDocument();
    
    // Check if estimate is rendered
    expect(screen.getByText('2 days')).toBeInTheDocument();
    
    // Check if dependencies indicator is rendered
    expect(screen.getByText('2 deps')).toBeInTheDocument();
  });
  
  it('should expand and show details when "Show Details" button is clicked', () => {
    render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPriorityChange={mockOnPriorityChange}
      />
    );
    
    // Initially, description should not be visible
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
    
    // Click the "Show Details" button
    fireEvent.click(screen.getByText('Show Details'));
    
    // Now description should be visible
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('This is a test task')).toBeInTheDocument();
    
    // Dependencies should be visible
    expect(screen.getByText('Dependencies')).toBeInTheDocument();
    
    // Notes should be visible
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Some notes about the task')).toBeInTheDocument();
    
    // Button text should change to "Hide Details"
    expect(screen.getByText('Hide Details')).toBeInTheDocument();
    
    // Click the "Hide Details" button
    fireEvent.click(screen.getByText('Hide Details'));
    
    // Description should be hidden again
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });
  
  it('should open menu and call edit function when edit option is clicked', () => {
    render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPriorityChange={mockOnPriorityChange}
      />
    );
    
    // Click the menu button
    fireEvent.click(screen.getByLabelText('more'));
    
    // Click the "Edit" option
    fireEvent.click(screen.getByText('Edit'));
    
    // Check if onEdit was called with the task ID
    expect(mockOnEdit).toHaveBeenCalledWith('123');
  });
  
  it('should open menu and call delete function when delete option is clicked', () => {
    render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPriorityChange={mockOnPriorityChange}
      />
    );
    
    // Click the menu button
    fireEvent.click(screen.getByLabelText('more'));
    
    // Click the "Delete" option
    fireEvent.click(screen.getByText('Delete'));
    
    // Check if onDelete was called with the task ID
    expect(mockOnDelete).toHaveBeenCalledWith('123');
  });
  
  it('should open menu and call priority change function when increase priority option is clicked', () => {
    render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPriorityChange={mockOnPriorityChange}
      />
    );
    
    // Click the menu button
    fireEvent.click(screen.getByLabelText('more'));
    
    // Click the "Increase Priority" option
    fireEvent.click(screen.getByText('Increase Priority'));
    
    // Check if onPriorityChange was called with the task ID and 'up'
    expect(mockOnPriorityChange).toHaveBeenCalledWith('123', 'up');
  });
  
  it('should open menu and call priority change function when decrease priority option is clicked', () => {
    render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPriorityChange={mockOnPriorityChange}
      />
    );
    
    // Click the menu button
    fireEvent.click(screen.getByLabelText('more'));
    
    // Click the "Decrease Priority" option
    fireEvent.click(screen.getByText('Decrease Priority'));
    
    // Check if onPriorityChange was called with the task ID and 'down'
    expect(mockOnPriorityChange).toHaveBeenCalledWith('123', 'down');
  });
  
  it('should apply dragging styles when isDragging is true', () => {
    const { rerender } = render(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPriorityChange={mockOnPriorityChange}
        isDragging={false}
      />
    );
    
    // Get the card element
    const card = screen.getByText('Test Task').closest('.MuiCard-root');
    
    // Check initial opacity
    expect(card).toHaveStyle('opacity: 1');
    
    // Rerender with isDragging=true
    rerender(
      <TaskCard
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPriorityChange={mockOnPriorityChange}
        isDragging={true}
      />
    );
    
    // Check opacity when dragging
    expect(card).toHaveStyle('opacity: 0.6');
  });
});
