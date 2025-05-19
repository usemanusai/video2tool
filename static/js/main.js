/**
 * Video2Tool main JavaScript file
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const removeFileBtn = document.getElementById('remove-file');
    const uploadForm = document.getElementById('upload-form');
    const uploadButton = document.getElementById('upload-button');
    const uploadSection = document.getElementById('upload-section');
    const processingSection = document.getElementById('processing-section');
    const resultsSection = document.getElementById('results-section');
    const progressBar = document.getElementById('progress-bar');
    const statusMessage = document.getElementById('status-message');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const downloadPdfBtn = document.getElementById('download-pdf');
    const downloadJsonBtn = document.getElementById('download-json');
    
    // Current task IDs
    let videoTaskId = null;
    let specTaskId = null;
    let tasksTaskId = null;
    
    // Results data
    let resultsData = {
        summary: null,
        specification: null,
        tasks: null
    };
    
    // File upload handling
    dropArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('active');
    });
    
    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('active');
    });
    
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('active');
        
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
    });
    
    removeFileBtn.addEventListener('click', () => {
        resetFileInput();
    });
    
    function handleFile(file) {
        // Check if file is a video
        if (!file.type.startsWith('video/')) {
            alert('Please upload a video file.');
            resetFileInput();
            return;
        }
        
        // Display file info
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = 'flex';
        uploadButton.disabled = false;
    }
    
    function resetFileInput() {
        fileInput.value = '';
        fileInfo.style.display = 'none';
        uploadButton.disabled = true;
    }
    
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    // Form submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!fileInput.files.length) {
            alert('Please select a file to upload.');
            return;
        }
        
        // Show processing section
        uploadSection.style.display = 'none';
        processingSection.style.display = 'block';
        
        // Upload the file
        await uploadVideo(fileInput.files[0]);
    });
    
    async function uploadVideo(file) {
        try {
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            
            // Update UI
            updateProgress(10);
            updateStatus('Uploading video...');
            
            // Upload the file
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }
            
            const data = await response.json();
            videoTaskId = data.task_id;
            
            // Poll for video processing completion
            updateProgress(20);
            updateStatus('Processing video...');
            await pollTaskCompletion(videoTaskId, 30, 60);
            
            // Generate specification
            updateProgress(60);
            updateStatus('Generating software specification...');
            const specResponse = await fetch(`/api/generate-specification/${videoTaskId}`, {
                method: 'POST'
            });
            
            if (!specResponse.ok) {
                throw new Error(`Specification generation failed: ${specResponse.statusText}`);
            }
            
            const specData = await specResponse.json();
            specTaskId = specData.task_id;
            
            // Poll for specification completion
            await pollTaskCompletion(specTaskId, 70, 80);
            
            // Generate tasks
            updateProgress(80);
            updateStatus('Creating development tasks...');
            const tasksResponse = await fetch(`/api/create-tasks/${specTaskId}`, {
                method: 'POST'
            });
            
            if (!tasksResponse.ok) {
                throw new Error(`Task generation failed: ${tasksResponse.statusText}`);
            }
            
            const tasksData = await tasksResponse.json();
            tasksTaskId = tasksData.task_id;
            
            // Poll for tasks completion
            await pollTaskCompletion(tasksTaskId, 90, 100);
            
            // Show results
            updateProgress(100);
            updateStatus('Complete!');
            
            // Load results data
            await loadResults();
            
            // Show results section after a short delay
            setTimeout(() => {
                processingSection.style.display = 'none';
                resultsSection.style.display = 'block';
            }, 1000);
            
        } catch (error) {
            console.error('Error:', error);
            updateStatus(`Error: ${error.message}`);
        }
    }
    
    async function pollTaskCompletion(taskId, startProgress, endProgress) {
        return new Promise((resolve, reject) => {
            const pollInterval = 2000; // 2 seconds
            const maxPolls = 300; // 10 minutes max
            let pollCount = 0;
            
            const poll = async () => {
                try {
                    const response = await fetch(`/api/task/${taskId}`);
                    
                    if (!response.ok) {
                        throw new Error(`Task polling failed: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    
                    // Calculate progress
                    const progressRange = endProgress - startProgress;
                    const progressIncrement = progressRange / maxPolls;
                    const currentProgress = startProgress + (progressIncrement * pollCount);
                    updateProgress(Math.min(currentProgress, endProgress - 1));
                    
                    if (data.status === 'completed') {
                        updateProgress(endProgress);
                        resolve(data);
                        return;
                    } else if (data.status === 'failed') {
                        reject(new Error(data.error || 'Task failed'));
                        return;
                    }
                    
                    // Continue polling if not complete
                    pollCount++;
                    
                    if (pollCount >= maxPolls) {
                        reject(new Error('Task timed out'));
                        return;
                    }
                    
                    setTimeout(poll, pollInterval);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            poll();
        });
    }
    
    async function loadResults() {
        try {
            // Load video analysis results
            const videoTask = await fetch(`/api/task/${videoTaskId}`).then(res => res.json());
            resultsData.summary = videoTask.result.summary;
            
            // Load specification results
            const specTask = await fetch(`/api/task/${specTaskId}`).then(res => res.json());
            resultsData.specification = specTask.result;
            
            // Load tasks results
            const tasksTask = await fetch(`/api/task/${tasksTaskId}`).then(res => res.json());
            resultsData.tasks = tasksTask.result;
            
            // Render results
            renderResults();
            
        } catch (error) {
            console.error('Error loading results:', error);
        }
    }
    
    function renderResults() {
        // Render summary
        const summaryContent = document.getElementById('summary-content');
        if (resultsData.summary && resultsData.summary.full_text) {
            summaryContent.innerHTML = `<div class="markdown">${markdownToHtml(resultsData.summary.full_text)}</div>`;
        }
        
        // Render specification
        const specificationContent = document.getElementById('specification-content');
        if (resultsData.specification && resultsData.specification.full_text) {
            specificationContent.innerHTML = `<div class="markdown">${markdownToHtml(resultsData.specification.full_text)}</div>`;
        }
        
        // Render tasks
        const tasksContent = document.getElementById('tasks-content');
        if (resultsData.tasks && resultsData.tasks.tasks) {
            const tasks = resultsData.tasks.tasks;
            let tasksHtml = '<div class="tasks-list">';
            
            // Group tasks by category
            const tasksByCategory = {};
            tasks.forEach(task => {
                const category = task.category || 'Uncategorized';
                if (!tasksByCategory[category]) {
                    tasksByCategory[category] = [];
                }
                tasksByCategory[category].push(task);
            });
            
            // Render tasks by category
            for (const [category, categoryTasks] of Object.entries(tasksByCategory)) {
                tasksHtml += `<h4>${category}</h4><ul class="task-category">`;
                
                categoryTasks.forEach(task => {
                    const priorityClass = `priority-${task.priority.toLowerCase()}`;
                    
                    tasksHtml += `
                        <li class="task-item ${priorityClass}">
                            <div class="task-header">
                                <span class="task-id">${task.id}</span>
                                <span class="task-name">${task.name}</span>
                                <span class="task-priority">${task.priority}</span>
                                <span class="task-estimate">${task.estimate}</span>
                            </div>
                            <div class="task-details">
                                <p>${task.description}</p>
                                ${task.dependencies.length ? `<p><strong>Dependencies:</strong> ${task.dependencies.join(', ')}</p>` : ''}
                                ${task.notes ? `<p><strong>Notes:</strong> ${task.notes}</p>` : ''}
                            </div>
                        </li>
                    `;
                });
                
                tasksHtml += '</ul>';
            }
            
            tasksHtml += '</div>';
            tasksContent.innerHTML = tasksHtml;
        }
    }
    
    // Tab handling
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            const tabId = button.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Download buttons
    downloadPdfBtn.addEventListener('click', () => {
        alert('PDF download functionality will be implemented in a future update.');
    });
    
    downloadJsonBtn.addEventListener('click', () => {
        // Create a JSON blob and download it
        const jsonData = JSON.stringify(resultsData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'video2tool-results.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    // Helper functions
    function updateProgress(percent) {
        progressBar.style.width = `${percent}%`;
    }
    
    function updateStatus(message) {
        statusMessage.textContent = message;
    }
    
    function markdownToHtml(markdown) {
        // Very simple markdown to HTML conversion
        // In a real app, use a proper markdown library
        let html = markdown
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            // Lists
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            // Paragraphs
            .replace(/\n\n/gim, '</p><p>');
        
        // Wrap in paragraph tags
        html = '<p>' + html + '</p>';
        
        // Fix lists
        html = html.replace(/<li>(.*?)<\/li><\/p><p>/gim, '<li>$1</li>');
        html = html.replace(/<p><li>/gim, '<ul><li>');
        html = html.replace(/<\/li><\/p>/gim, '</li></ul>');
        
        return html;
    }
});
