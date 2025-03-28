// We wait for DOM to be fully loaded before initializing
document.addEventListener("DOMContentLoaded", function() {
    setupFormHandler();
    setupNotificationSystem();
});

// This works by creating an object with methods for different notification types of either error or success
// Calling either of these methods calls the main functionality, show(), which manipulates the notification element in HTML
// The show() method changes the element based on type and displays the message to the user
// The hide() function makes sure that the notification fades away after 5 seconds
const notificationSystem = {
    show: function(message, type = 'error') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notification-message');
        
        messageElement.textContent = message;
        
        if (type === 'error') {
            notification.style.backgroundColor = '#f8d7da';
            notification.style.color = '#721c24';
            notification.style.border = '1px solid #f5c6cb';
        } else {
            notification.style.backgroundColor = '#d4edda';
            notification.style.color = '#155724'; 
            notification.style.border = '1px solid #c3e6cb';
        }
        
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.hide(), 5000);
    },
    
    hide: function() {
        const notification = document.getElementById('notification');
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 500);
    },
    
    error: function(message) {
        this.show(message, 'error');
    },
    
    success: function(message) {
        this.show(message, 'success');
    },
};

function setupNotificationSystem() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
    }
}

function setupFormHandler() {
    const form = document.getElementById("github-url-form");

    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        const submitButton = document.getElementById("repo-url-button");

        submitButton.value = "Loading...";
        submitButton.disabled = true;

        try {
            const repoURL = document.getElementById("repo-url").value;
            
            if (repoURL.length == 0) {
                throw new Error("Please enter a GitHub repository URL");
            }
            
            const repoInfo = extractGitHubInfo(repoURL);
            
            if (!repoInfo) {
                throw new Error("Invalid GitHub URL format. Please enter a valid GitHub repository URL ->(https://github.com/username/repository)");
            }
            
            const repositoryInfo = await getRepoInformation(repoInfo);
            const languages = await getRepoLanguages(repoInfo)
            
            if (repositoryInfo) {
                preFillFields(repositoryInfo, languages);
                notificationSystem.success("Repository data loaded successfully!");
            } else {
                throw new Error("Could not fetch repository information. Please check the URL and try again.");
            }
            
        } catch (error) {
            console.error(error.message);
            notificationSystem.error(error.message); 
        } finally {
            submitButton.value = "Submit";
            submitButton.disabled = false;
        }
    });
}

function extractGitHubInfo(url) {
    // Regex pattern to match GitHub URLs and extract org and repo
    const regex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/\s]+)/;
    const match = url.match(regex);
  
    if (match && match.length === 3) {
        return {
            organization: match[1],
            repository: match[2]
        };
    }
    
    return null;
}

async function getRepoInformation(repoInfo) {
    const baseURL = "https://api.github.com/repos/";
    const endpoint = `${baseURL}${repoInfo.organization}/${repoInfo.repository}`;

    try {
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`GitHub API error (${response.status}): ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error.message);
    }
}

async function getRepoLanguages(repoInfo) {
    const endpoint = `https://api.github.com/repos/${repoInfo.organization}/${repoInfo.repository}/languages`

    try {
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`GitHub API error (${response.status}): ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error.message);
    }
}

function preFillFields(repoData, languages) {
    if (!window.formIOInstance) {
        notificationSystem.error("Form interface not initialized. Please refresh and try again.");
        return;
    }

    try {
        let licenses = [];
        if (repoData.license && repoData.license.spdx_id) {
            licenses.push({
                name: repoData.license.spdx_id,
                URL: repoData.html_url + "/blob/main/LICENSE"
            });
        }
        
        const submission = {
            data: {
                name: repoData.name || '',
                description: repoData.description || '',
                
                repositoryURL: repoData.html_url || '',
                repositoryVisibility: repoData.private ? "private" : "public",
                vcs: 'git',
                
                permissions: {
                    licenses: licenses
                },
                
                reuseFrequency: {
                    forks: repoData.forks_count || 0
                },
                
                languages: Object.keys(languages) || [],
                
                date: {
                    created: repoData.created_at || '',
                    lastModified: repoData.updated_at || '',
                    metaDataLastUpdated: new Date().toISOString()
                },

                tags: repoData.topics || [],
                
                feedbackMechanisms: [repoData.html_url + "/issues"]
            }
        };
        
        window.formIOInstance.setSubmission(submission);
        
    } catch (error) {
        notificationSystem.error("Error filling form fields with repository data. Please refresh and try again");
        console.error("Form fill error:", error);
    }
}

// This is global so we could use this throughout the website!
window.showErrorNotification = function(message) {
    notificationSystem.error(message);
};

window.showSuccessNotification = function(message) {
    notificationSystem.success(message);
};