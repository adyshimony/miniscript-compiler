import init, { compile_miniscript, compile_policy } from './pkg/miniscript_wasm.js';

class MiniscriptCompiler {
    constructor() {
        this.wasm = null;
        this.keyVariables = new Map();
        this.init();
    }

    async init() {
        try {
            this.wasm = await init();
            console.log('WASM module initialized');
            this.setupEventListeners();
            this.loadSavedExpressions();
            this.loadSavedPolicies();
            this.loadKeyVariables();
            this.setupReplaceKeysCheckbox();
        } catch (error) {
            console.error('Failed to initialize WASM module:', error);
            this.showError('Failed to load compiler module. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Policy compile button
        document.getElementById('compile-policy-btn').addEventListener('click', () => {
            this.compilePolicy();
        });

        // Clear policy button
        document.getElementById('clear-policy-btn').addEventListener('click', () => {
            this.clearPolicy();
        });

        // Compile button
        document.getElementById('compile-btn').addEventListener('click', () => {
            this.compileExpression();
        });

        // Save policy button  
        document.getElementById('save-policy-btn').addEventListener('click', () => {
            this.showSavePolicyModal();
        });

        // Save button
        document.getElementById('save-btn').addEventListener('click', () => {
            this.showSaveModal();
        });

        // Clear button
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearExpression();
        });

        // Save modal buttons
        document.getElementById('confirm-save').addEventListener('click', () => {
            this.saveExpression();
        });

        document.getElementById('cancel-save').addEventListener('click', () => {
            this.hideSaveModal();
        });

        // Save policy modal buttons
        document.getElementById('confirm-save-policy').addEventListener('click', () => {
            this.savePolicy();
        });

        document.getElementById('cancel-save-policy').addEventListener('click', () => {
            this.hideSavePolicyModal();
        });

        // Close modal when clicking outside
        document.getElementById('save-modal').addEventListener('click', (e) => {
            if (e.target.id === 'save-modal') {
                this.hideSaveModal();
            }
        });

        document.getElementById('save-policy-modal').addEventListener('click', (e) => {
            if (e.target.id === 'save-policy-modal') {
                this.hideSavePolicyModal();
            }
        });

        // Enter key in textarea compiles
        document.getElementById('expression-input').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.compileExpression();
            }
        });

        // Enter key in save input saves
        document.getElementById('save-name').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveExpression();
            }
        });

        document.getElementById('save-policy-name').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.savePolicy();
            }
        });

        // Enter key in policy input compiles
        document.getElementById('policy-input').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.compilePolicy();
            }
        });

        // Add key button
        document.getElementById('add-key-btn').addEventListener('click', () => {
            this.addKeyVariable();
        });

        // Generate key button - using onclick in HTML

        // Enter key in key inputs adds key
        document.getElementById('key-name-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('key-value-input').focus();
            }
        });

        document.getElementById('key-value-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addKeyVariable();
            }
        });

    }

    compileExpression() {
        const expression = document.getElementById('expression-input').value.trim();
        const context = document.querySelector('input[name="context"]:checked').value;
        
        // Clear previous messages
        this.clearMiniscriptMessages();
        
        if (!expression) {
            this.showMiniscriptError('Please enter a miniscript expression.');
            return;
        }

        if (!this.wasm) {
            this.showMiniscriptError('Compiler not ready, please wait and try again.');
            return;
        }

        // Show loading state
        const compileBtn = document.getElementById('compile-btn');
        const originalText = compileBtn.textContent;
        compileBtn.textContent = '⏳ Compiling...';
        compileBtn.disabled = true;

        try {
            // Replace key variables in expression
            const processedExpression = this.replaceKeyVariables(expression);
            
            // Call the WASM function with context
            const result = compile_miniscript(processedExpression, context);
            
            // Reset button
            compileBtn.textContent = originalText;
            compileBtn.disabled = false;

            if (result.success) {
                // Debug: Log all available fields
                console.log('=== ALL COMPILATION RESULT FIELDS ===');
                console.log('success:', result.success);
                console.log('error:', result.error);
                console.log('script:', result.script ? `"${result.script.substring(0, 50)}..." (length: ${result.script.length})` : result.script);
                console.log('script_asm:', result.script_asm ? `"${result.script_asm.substring(0, 50)}..." (length: ${result.script_asm.length})` : result.script_asm);
                console.log('address:', result.address);
                console.log('script_size:', result.script_size);
                console.log('miniscript_type:', result.miniscript_type);
                console.log('compiled_miniscript:', result.compiled_miniscript);
                console.log('=====================================');
                
                // Simple success message for now
                this.showMiniscriptSuccess(`Compilation successful - ${result.miniscript_type}, ${result.script_size} bytes`);
                // Display results (without the info box since we show it in the success message)
                this.displayResults(result);
            } else {
                this.showMiniscriptError(result.error);
                // Clear results
                document.getElementById('results').innerHTML = '';
            }
            
        } catch (error) {
            console.error('Compilation error:', error);
            compileBtn.textContent = originalText;
            compileBtn.disabled = false;
            this.showMiniscriptError(`Compilation failed: ${error.message}`);
        }
    }

    compilePolicy() {
        const policy = document.getElementById('policy-input').value.trim();
        const context = document.querySelector('input[name="context"]:checked').value;
        
        // Clear previous errors
        this.clearPolicyErrors();
        
        if (!policy) {
            this.showPolicyError('Please enter a policy expression.');
            return;
        }

        if (!this.wasm) {
            this.showPolicyError('Compiler not ready, please wait and try again.');
            return;
        }

        // Show loading state
        const compilePolicyBtn = document.getElementById('compile-policy-btn');
        const originalText = compilePolicyBtn.textContent;
        compilePolicyBtn.textContent = '⏳ Compiling...';
        compilePolicyBtn.disabled = true;

        try {
            // Replace key variables in policy
            const processedPolicy = this.replaceKeyVariables(policy);
            
            // Call the WASM function with context
            const result = compile_policy(processedPolicy, context);
            
            // Reset button
            compilePolicyBtn.textContent = originalText;
            compilePolicyBtn.disabled = false;

            if (result.success && result.compiled_miniscript) {
                // Success: fill the miniscript field and show results
                document.getElementById('expression-input').value = result.compiled_miniscript;
                
                // Reset the "Show key names" checkbox since we have a new expression
                const checkbox = document.getElementById('replace-keys-checkbox');
                if (checkbox) {
                    checkbox.checked = false;
                }
                
                // Show green success message in miniscript messages area
                this.showMiniscriptSuccess(`Compilation successful - ${result.miniscript_type}, ${result.script_size} bytes`);
                
                // Don't display the compiled_miniscript in results since it's now in the text box
                result.compiled_miniscript = null;
                // Display results (script, asm, address)
                this.displayResults(result);
            } else {
                // Error: show policy-specific error
                this.showPolicyError(result.error || 'Policy compilation failed');
                // Clear results and miniscript messages
                document.getElementById('results').innerHTML = '';
                this.clearMiniscriptMessages();
            }
            
        } catch (error) {
            console.error('Policy compilation error:', error);
            compilePolicyBtn.textContent = originalText;
            compilePolicyBtn.disabled = false;
            this.showPolicyError(`Policy compilation failed: ${error.message}`);
        }
    }

    clearPolicy() {
        document.getElementById('policy-input').value = '';
        document.getElementById('expression-input').value = '';
        document.getElementById('results').innerHTML = '';
        this.clearPolicyErrors();
        
        // Reset the "Show key names" checkbox since we cleared the miniscript
        const checkbox = document.getElementById('replace-keys-checkbox');
        if (checkbox) {
            checkbox.checked = false;
        }
        
        // Hide description panel
        const policyPanel = document.querySelector('.policy-description-panel');
        if (policyPanel) policyPanel.style.display = 'none';
    }

    showPolicyError(message) {
        const policyErrorsDiv = document.getElementById('policy-errors');
        policyErrorsDiv.innerHTML = `
            <div class="result-box error" style="margin: 0;">
                <h4>❌ Policy error</h4>
                <div style="margin-top: 10px;">${message}</div>
            </div>
        `;
    }

    clearPolicyErrors() {
        document.getElementById('policy-errors').innerHTML = '';
    }

    replaceKeyVariables(text) {
        let processedText = text;
        for (const [name, value] of this.keyVariables) {
            // Replace key variables in pk(), using word boundaries to avoid partial matches
            const regex = new RegExp('\\b' + name + '\\b', 'g');
            processedText = processedText.replace(regex, value);
        }
        return processedText;
    }

    generateKey() {
        console.log('Generate key button clicked!');
        
        // 66-character compressed keys for Legacy/Segwit v0 (20 keys)
        const compressedKeys = [
            '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
            '03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd',
            '03defdea4cdb677750a420fee807eacf21eb9898ae79b9768766e4faa04a2d4a34',
            '034cf034640859162ba19ee5a5a33e713a86e2e285b79cdaf9d5db4a07aa59f765',
            '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
            '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
            '03774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb',
            '02e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13',
            '03d01115d548e7561b15c38f004d734633687cf4419620095bc5b0f47070afe85a',
            '02791ca97e3d5c1dc6bc7e7e1a1e5fc19b90e0e8b1f9f0f1b2c3d4e5f6a7b8c9',
            '03581c63a4f65b4dfb3baf7d5c3e5a6d4f0e7b2c8a9f1d3e4b2a5c6d7e8f9a0b',
            '022f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4',
            '02bf0e7b0c8a7b1f9a3e4d2c5b6a8f9d0e7c1b4a3f6e9d2c5b8a1f4e7d0c3b6a',
            '032c0b7cf95324a07d05398b240174dc0c2be444d96b159aa6c7f7b1e668680991',
            '020e46e79a2a8d12b9b21b533e2f1c6d5a7f8e9c0b1d2a3f4e5c6b7a8f9d0e3c',
            '03fff97bd5755eeea420453a14355235d382f6472f8568a18b2f057a1460297556',
            '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357',
            '03d30199d74fb5a22d47b6e054e2f378cedacffcb89904a61d75d0dbd407143e65',
            '023da092f6980e58d2c037173180e9a465476026ee50f96695963e8efe436f54eb',
            '03acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe'
        ];
        
        // 64-character X-only keys for Taproot (20 keys)
        const xOnlyKeys = [
            'f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
            'a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd',
            'defdea4cdb677750a420fee807eacf21eb9898ae79b9768766e4faa04a2d4a34',
            '4cf034640859162ba19ee5a5a33e713a86e2e285b79cdaf9d5db4a07aa59f765',
            '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
            'c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
            '774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb',
            'e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13',
            'd01115d548e7561b15c38f004d734633687cf4419620095bc5b0f47070afe85a',
            '791ca97e3d5c1dc6bc7e7e1a1e5fc19b90e0e8b1f9f0f1b2c3d4e5f6a7b8c9',
            '581c63a4f65b4dfb3baf7d5c3e5a6d4f0e7b2c8a9f1d3e4b2a5c6d7e8f9a0b',
            '2f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4',
            'bf0e7b0c8a7b1f9a3e4d2c5b6a8f9d0e7c1b4a3f6e9d2c5b8a1f4e7d0c3b6a',
            '2c0b7cf95324a07d05398b240174dc0c2be444d96b159aa6c7f7b1e668680991',
            '0e46e79a2a8d12b9b21b533e2f1c6d5a7f8e9c0b1d2a3f4e5c6b7a8f9d0e3c',
            'fff97bd5755eeea420453a14355235d382f6472f8568a18b2f057a1460297556',
            '5476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357',
            'd30199d74fb5a22d47b6e054e2f378cedacffcb89904a61d75d0dbd407143e65',
            '3da092f6980e58d2c037173180e9a465476026ee50f96695963e8efe436f54eb',
            'acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe'
        ];
        
        // Get selected context
        const selectedContext = document.querySelector('input[name="context"]:checked')?.value || 'segwit';
        
        // Choose key pool based on context
        let keyPool;
        if (selectedContext === 'taproot') {
            keyPool = xOnlyKeys; // 64-character X-only keys for Taproot
        } else {
            keyPool = compressedKeys; // 66-character compressed keys for Legacy/Segwit
        }
        
        // Get already used keys
        const usedKeys = Array.from(this.keyVariables.values());
        
        // Filter out already used keys from the appropriate pool
        const availableKeys = keyPool.filter(key => !usedKeys.includes(key));
        
        // If all keys are used, return a random one anyway
        const keysToUse = availableKeys.length > 0 ? availableKeys : keyPool;
        
        // Simple random selection from available keys
        const randomIndex = Math.floor(Math.random() * keysToUse.length);
        const publicKey = keysToUse[randomIndex];
        
        console.log('Selected context:', selectedContext);
        console.log('Key pool length:', keyPool.length);
        console.log('Generated public key:', publicKey);
        console.log('Key length:', publicKey.length);
        console.log('Available keys:', availableKeys.length, 'Used keys:', usedKeys.length);
        
        // Set the generated key in the value input
        const valueInput = document.getElementById('key-value-input');
        if (valueInput) {
            valueInput.value = publicKey;
            console.log('Set value input to:', publicKey);
        } else {
            console.error('Could not find key-value-input element');
        }
        
        // Focus on the name input if it's empty
        const nameInput = document.getElementById('key-name-input');
        if (nameInput && !nameInput.value.trim()) {
            nameInput.focus();
        }
    }

    generateCompressedPublicKey(privateKey) {
        // 66-character compressed keys for Legacy/Segwit v0 (20 keys)
        const compressedKeys = [
            '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
            '03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd',
            '03defdea4cdb677750a420fee807eacf21eb9898ae79b9768766e4faa04a2d4a34',
            '034cf034640859162ba19ee5a5a33e713a86e2e285b79cdaf9d5db4a07aa59f765',
            '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
            '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
            '03774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb',
            '02e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13',
            '03d01115d548e7561b15c38f004d734633687cf4419620095bc5b0f47070afe85a',
            '02791ca97e3d5c1dc6bc7e7e1a1e5fc19b90e0e8b1f9f0f1b2c3d4e5f6a7b8c9',
            '03581c63a4f65b4dfb3baf7d5c3e5a6d4f0e7b2c8a9f1d3e4b2a5c6d7e8f9a0b',
            '022f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4',
            '02bf0e7b0c8a7b1f9a3e4d2c5b6a8f9d0e7c1b4a3f6e9d2c5b8a1f4e7d0c3b6a',
            '032c0b7cf95324a07d05398b240174dc0c2be444d96b159aa6c7f7b1e668680991',
            '020e46e79a2a8d12b9b21b533e2f1c6d5a7f8e9c0b1d2a3f4e5c6b7a8f9d0e3c',
            '03fff97bd5755eeea420453a14355235d382f6472f8568a18b2f057a1460297556',
            '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357',
            '03d30199d74fb5a22d47b6e054e2f378cedacffcb89904a61d75d0dbd407143e65',
            '023da092f6980e58d2c037173180e9a465476026ee50f96695963e8efe436f54eb',
            '03acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe'
        ];
        
        // 64-character X-only keys for Taproot (20 keys)
        const xOnlyKeys = [
            'f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
            'a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd',
            'defdea4cdb677750a420fee807eacf21eb9898ae79b9768766e4faa04a2d4a34',
            '4cf034640859162ba19ee5a5a33e713a86e2e285b79cdaf9d5db4a07aa59f765',
            '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
            'c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
            '774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb',
            'e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13',
            'd01115d548e7561b15c38f004d734633687cf4419620095bc5b0f47070afe85a',
            '791ca97e3d5c1dc6bc7e7e1a1e5fc19b90e0e8b1f9f0f1b2c3d4e5f6a7b8c9',
            '581c63a4f65b4dfb3baf7d5c3e5a6d4f0e7b2c8a9f1d3e4b2a5c6d7e8f9a0b',
            '2f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4',
            'bf0e7b0c8a7b1f9a3e4d2c5b6a8f9d0e7c1b4a3f6e9d2c5b8a1f4e7d0c3b6a',
            '2c0b7cf95324a07d05398b240174dc0c2be444d96b159aa6c7f7b1e668680991',
            '0e46e79a2a8d12b9b21b533e2f1c6d5a7f8e9c0b1d2a3f4e5c6b7a8f9d0e3c',
            'fff97bd5755eeea420453a14355235d382f6472f8568a18b2f057a1460297556',
            '5476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357',
            'd30199d74fb5a22d47b6e054e2f378cedacffcb89904a61d75d0dbd407143e65',
            '3da092f6980e58d2c037173180e9a465476026ee50f96695963e8efe436f54eb',
            'acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe'
        ];
        
        // Get selected context
        const selectedContext = document.querySelector('input[name="context"]:checked')?.value || 'segwit';
        
        // Choose key pool based on context
        let keyPool;
        if (selectedContext === 'taproot') {
            keyPool = xOnlyKeys; // 64-character X-only keys for Taproot
        } else {
            keyPool = compressedKeys; // 66-character compressed keys for Legacy/Segwit
        }
        
        // Get already used keys
        const usedKeys = Array.from(this.keyVariables.values());
        
        // Filter out already used keys from the appropriate pool
        const availableKeys = keyPool.filter(key => !usedKeys.includes(key));
        
        // If all keys are used, return a random one anyway
        const keysToUse = availableKeys.length > 0 ? availableKeys : keyPool;
        
        // Use private key bytes to deterministically select from available keys
        const index = privateKey.reduce((acc, byte) => acc + byte, 0) % keysToUse.length;
        return keysToUse[index];
    }

    addKeyVariable() {
        const name = document.getElementById('key-name-input').value.trim();
        const value = document.getElementById('key-value-input').value.trim();

        if (!name || !value) {
            alert('Please enter both key name and value.');
            return;
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
            alert('Key name must start with a letter or underscore and contain only letters, numbers, and underscores.');
            return;
        }

        // Add or update key variable
        this.keyVariables.set(name, value);
        this.saveKeyVariables();
        this.displayKeyVariables();

        // Clear inputs
        document.getElementById('key-name-input').value = '';
        document.getElementById('key-value-input').value = '';
        document.getElementById('key-name-input').focus();
    }

    deleteKeyVariable(name) {
        if (!confirm(`Are you sure you want to delete key variable "${name}"?`)) {
            return;
        }
        
        this.keyVariables.delete(name);
        this.saveKeyVariables();
        this.displayKeyVariables();
    }

    displayKeyVariables() {
        const listDiv = document.getElementById('key-variables-list');
        
        if (this.keyVariables.size === 0) {
            listDiv.innerHTML = '<p style="color: var(--text-muted); font-style: italic; font-size: 14px;">No key variables defined.</p>';
            return;
        }

        listDiv.innerHTML = Array.from(this.keyVariables.entries()).map(([name, value]) => {
            const isXOnly = value.length === 64;
            const keyClass = isXOnly ? 'xonly' : 'compressed';
            const badgeText = isXOnly ? 'x-only' : 'compressed';
            
            return `
            <div class="key-variable-item">
                <div class="key-info">
                    <div class="key-name">${this.escapeHtml(name)}</div>
                    <div class="key-value ${keyClass}">
                        <span>${this.escapeHtml(value)}</span>
                        <span class="key-badge ${keyClass}">${badgeText}</span>
                    </div>
                </div>
                <button onclick="compiler.deleteKeyVariable('${this.escapeHtml(name)}')" class="danger-btn" style="padding: 4px 8px; font-size: 10px; flex-shrink: 0;">Del</button>
            </div>
            `;
        }).join('');
    }

    loadKeyVariables() {
        try {
            const saved = localStorage.getItem('miniscript-key-variables');
            if (saved) {
                const keyVars = JSON.parse(saved);
                this.keyVariables = new Map(Object.entries(keyVars));
            } else {
                // Add default keys if none exist
                this.addDefaultKeys();
            }
            this.displayKeyVariables();
        } catch (error) {
            console.error('Failed to load key variables:', error);
            this.keyVariables = new Map();
            this.addDefaultKeys();
        }
    }

    addDefaultKeys() {
        // Default keys used in examples
        // Compressed keys (for Legacy/Segwit)
        this.keyVariables.set('Alice', '03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd');
        this.keyVariables.set('Bob', '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9');
        this.keyVariables.set('Charlie', '03defdea4cdb677750a420fee807eacf21eb9898ae79b9768766e4faa04a2d4a34');
        this.keyVariables.set('Eve', '034cf034640859162ba19ee5a5a33e713a86e2e285b79cdaf9d5db4a07aa59f765');
        this.keyVariables.set('Frank', '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798');
        this.keyVariables.set('Grace', '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5');
        
        // X-only keys (for Taproot)
        this.keyVariables.set('David', 'f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9');
        this.keyVariables.set('Helen', 'a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd');
        this.keyVariables.set('Ivan', 'defdea4cdb677750a420fee807eacf21eb9898ae79b9768766e4faa04a2d4a34');
        this.keyVariables.set('Julia', '4cf034640859162ba19ee5a5a33e713a86e2e285b79cdaf9d5db4a07aa59f765');
        this.keyVariables.set('Karl', '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798');
        
        this.saveKeyVariables();
        this.displayKeyVariables();
    }

    restoreDefaultKeys() {
        if (confirm('This will restore the default key variables (Alice, Bob, Charlie, Eve, Frank, Grace, David, Helen, Ivan, Julia, Karl). Continue?')) {
            this.addDefaultKeys();
        }
    }

    clearAllKeys() {
        if (confirm('Are you sure you want to delete ALL key variables? This cannot be undone.')) {
            this.keyVariables.clear();
            this.saveKeyVariables();
            this.displayKeyVariables();
            
            // Hide description panels
            const policyPanel = document.querySelector('.policy-description-panel');
            const miniscriptPanel = document.querySelector('.miniscript-description-panel');
            if (policyPanel) policyPanel.style.display = 'none';
            if (miniscriptPanel) miniscriptPanel.style.display = 'none';
        }
    }

    saveKeyVariables() {
        try {
            const keyVars = Object.fromEntries(this.keyVariables);
            localStorage.setItem('miniscript-key-variables', JSON.stringify(keyVars));
        } catch (error) {
            console.error('Failed to save key variables:', error);
        }
    }


    displayResults(result) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = '';

        if (!result.success) {
            return;
        }

        // Show compiled miniscript (for policy compilation)
        if (result.compiled_miniscript) {
            const miniscriptDiv = document.createElement('div');
            miniscriptDiv.className = 'result-box info';
            miniscriptDiv.innerHTML = `
                <h4>🔄 Compiled miniscript</h4>
                <textarea readonly style="width: 100%; min-height: 60px; margin-top: 10px; font-family: monospace; background: var(--info-bg); padding: 10px; border-radius: 4px; border: 1px solid var(--border-color); resize: vertical; color: var(--text-color); box-sizing: border-box;">${result.compiled_miniscript}</textarea>
            `;
            resultsDiv.appendChild(miniscriptDiv);
        }

        // Show script hex
        if (result.script) {
            const scriptDiv = document.createElement('div');
            scriptDiv.className = 'result-box info';
            scriptDiv.innerHTML = `
                <h4>📜 Generated script (hex)</h4>
                <textarea readonly style="width: 100%; min-height: 60px; margin-top: 10px; font-family: monospace; background: var(--info-bg); padding: 10px; border-radius: 4px; border: 1px solid var(--border-color); resize: vertical; color: var(--text-color); box-sizing: border-box;">${result.script}</textarea>
            `;
            resultsDiv.appendChild(scriptDiv);
        }

        // Show script ASM
        if (result.script_asm) {
            const scriptAsmDiv = document.createElement('div');
            scriptAsmDiv.className = 'result-box info';
            
            const simplifiedAsm = this.simplifyAsm(result.script_asm);
            const currentAsm = document.getElementById('hide-pushbytes') && document.getElementById('hide-pushbytes').checked ? 
                simplifiedAsm : result.script_asm;
                
            scriptAsmDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0;">⚡ Bitcoin script (ASM)</h4>
                    <label style="display: flex; align-items: center; gap: 5px; font-size: 12px; cursor: pointer; font-weight: normal;">
                        <input type="checkbox" id="hide-pushbytes" ${document.getElementById('hide-pushbytes') && document.getElementById('hide-pushbytes').checked ? 'checked' : ''} style="margin: 0;">
                        Hide pushbytes
                    </label>
                </div>
                <textarea readonly id="script-asm-display" style="width: 100%; min-height: 80px; font-family: monospace; background: var(--info-bg); padding: 10px; border-radius: 4px; border: 1px solid var(--border-color); resize: vertical; color: var(--text-color); box-sizing: border-box;">${currentAsm}</textarea>
            `;
            
            // Add event listener for checkbox
            const checkbox = scriptAsmDiv.querySelector('#hide-pushbytes');
            const display = scriptAsmDiv.querySelector('#script-asm-display');
            checkbox.addEventListener('change', () => {
                display.value = checkbox.checked ? simplifiedAsm : result.script_asm;
            });
            
            resultsDiv.appendChild(scriptAsmDiv);
        }

        // Show address if available
        if (result.address) {
            const addressDiv = document.createElement('div');
            addressDiv.className = 'result-box info';
            addressDiv.innerHTML = `
                <h4>🏠 Generated address</h4>
                <div style="word-break: break-all; margin-top: 10px; font-family: monospace; background: var(--info-bg); padding: 10px; border-radius: 4px; border: 1px solid var(--border-color);">
                    ${result.address}
                </div>
            `;
            resultsDiv.appendChild(addressDiv);
        } else {
            const noAddressDiv = document.createElement('div');
            noAddressDiv.className = 'result-box info';
            noAddressDiv.innerHTML = `
                <h4>ℹ️ Note</h4>
                <div style="margin-top: 10px;">
                    Address generation not available for this miniscript type without additional context.
                </div>
            `;
            resultsDiv.appendChild(noAddressDiv);
        }
    }

    showError(message) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div class="result-box error">
                <h4>❌ Error</h4>
                <div style="margin-top: 10px;">${message}</div>
            </div>
        `;
    }

    showMiniscriptError(message) {
        const messagesDiv = document.getElementById('miniscript-messages');
        messagesDiv.innerHTML = `
            <div class="result-box error" style="margin: 0;">
                <h4>❌ Miniscript error</h4>
                <div style="margin-top: 10px;">${message}</div>
            </div>
        `;
    }

    showMiniscriptSuccess(message) {
        const messagesDiv = document.getElementById('miniscript-messages');
        messagesDiv.innerHTML = `
            <div class="result-box success" style="margin: 0;">
                <h4>✅ Success</h4>
                <div style="margin-top: 10px;">${message}</div>
            </div>
        `;
    }

    clearMiniscriptMessages() {
        document.getElementById('miniscript-messages').innerHTML = '';
    }

    handleReplaceKeysToggle(isChecked) {
        console.log('=== handleReplaceKeysToggle START ===');
        console.log('isChecked:', isChecked);
        
        const expressionInput = document.getElementById('expression-input');
        if (!expressionInput) {
            console.error('Expression input not found!');
            return;
        }
        
        let expression = expressionInput.value;
        console.log('Current expression:', `"${expression}"`);
        console.log('Expression length:', expression.length);
        
        console.log('this.keyVariables type:', typeof this.keyVariables);
        console.log('this.keyVariables size:', this.keyVariables ? this.keyVariables.size : 'undefined');
        console.log('Key variables entries:', Array.from(this.keyVariables.entries()));

        if (!expression.trim()) {
            console.log('Expression is empty, returning');
            return;
        }

        let originalExpression = expression;
        
        if (isChecked) {
            console.log('=== REPLACING KEYS WITH NAMES ===');
            expression = this.replaceKeysWithNames(expression);
        } else {
            console.log('=== REPLACING NAMES WITH KEYS ===');
            expression = this.replaceNamesWithKeys(expression);
        }

        console.log('Original expression:', `"${originalExpression}"`);
        console.log('New expression:     ', `"${expression}"`);
        console.log('Changed:', originalExpression !== expression);
        
        expressionInput.value = expression;
        console.log('=== handleReplaceKeysToggle END ===');
    }

    replaceKeysWithNames(text) {
        let processedText = text;
        for (const [name, value] of this.keyVariables) {
            // Simple string replacement - no word boundaries for hex keys
            processedText = processedText.split(value).join(name);
        }
        return processedText;
    }

    replaceNamesWithKeys(text) {
        let processedText = text;
        for (const [name, value] of this.keyVariables) {
            // Use word boundaries for variable names to avoid partial matches
            const regex = new RegExp('\\b' + name + '\\b', 'g');
            processedText = processedText.replace(regex, value);
        }
        return processedText;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    setupReplaceKeysCheckbox() {
        console.log('Setting up replace keys checkbox');
        // Wait for DOM to be ready
        setTimeout(() => {
            const checkbox = document.getElementById('replace-keys-checkbox');
            console.log('Looking for checkbox element:', checkbox);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    console.log('Checkbox clicked, checked:', e.target.checked);
                    this.handleReplaceKeysToggle(e.target.checked);
                });
                console.log('Checkbox event listener added successfully');
            } else {
                console.error('Replace keys checkbox not found in DOM');
                // Try again in case DOM isn't ready
                setTimeout(() => {
                    const checkboxRetry = document.getElementById('replace-keys-checkbox');
                    console.log('Retry - Looking for checkbox:', checkboxRetry);
                    if (checkboxRetry) {
                        checkboxRetry.addEventListener('change', (e) => {
                            console.log('Checkbox clicked (retry), checked:', e.target.checked);
                            this.handleReplaceKeysToggle(e.target.checked);
                        });
                        console.log('Checkbox event listener added on retry');
                    } else {
                        console.error('Checkbox still not found on retry');
                    }
                }, 1000);
            }
        }, 100);
    }

    clearExpression() {
        document.getElementById('expression-input').value = '';
        document.getElementById('results').innerHTML = '';
        this.clearMiniscriptMessages();
        
        // Clear and uncheck the "Show key names" checkbox
        const checkbox = document.getElementById('replace-keys-checkbox');
        if (checkbox) {
            checkbox.checked = false;
        }
        
        // Hide description panel
        const miniscriptPanel = document.querySelector('.miniscript-description-panel');
        if (miniscriptPanel) miniscriptPanel.style.display = 'none';
    }

    showSaveModal() {
        const expression = document.getElementById('expression-input').value.trim();
        if (!expression) {
            this.showMiniscriptError('Please enter an expression to save.');
            return;
        }
        
        document.getElementById('save-modal').style.display = 'block';
        document.getElementById('save-name').focus();
    }

    hideSaveModal() {
        document.getElementById('save-modal').style.display = 'none';
        document.getElementById('save-name').value = '';
        // Remove any existing error messages
        const errorDiv = document.querySelector('#save-modal .modal-error');
        if (errorDiv) errorDiv.remove();
    }

    saveExpression() {
        const name = document.getElementById('save-name').value.trim();
        const expression = document.getElementById('expression-input').value.trim();

        if (!name) {
            this.showModalError('Please enter a name for the expression.');
            return;
        }

        if (name.length > 50) {
            this.showModalError('Expression name must be 50 characters or less.');
            return;
        }

        if (!expression) {
            this.showModalError('No expression to save.');
            return;
        }

        // Get existing expressions
        const savedExpressions = this.getSavedExpressions();
        
        // Check storage limits (keep max 20 expressions)
        if (savedExpressions.length >= 20 && !savedExpressions.some(expr => expr.name === name)) {
            this.showModalError('Maximum 20 expressions allowed. Please delete some first.');
            return;
        }
        
        // Check if name already exists
        if (savedExpressions.some(expr => expr.name === name)) {
            if (!confirm(`An expression named "${this.escapeHtml(name)}" already exists. Overwrite?`)) {
                return;
            }
            // Remove existing
            savedExpressions.splice(savedExpressions.findIndex(expr => expr.name === name), 1);
        }

        // Add new expression with context
        const context = document.querySelector('input[name="context"]:checked').value;
        savedExpressions.push({
            name: name,
            expression: expression,
            context: context,
            timestamp: new Date().toISOString()
        });

        // Save to localStorage
        this.setSavedExpressions(savedExpressions);
        
        // Refresh the list
        this.loadSavedExpressions();
        
        // Hide modal
        this.hideSaveModal();
        
        // Show success message
        this.showSuccess(`Expression "${this.escapeHtml(name)}" has been saved!`);
    }

    showModalError(message) {
        const modalContent = document.querySelector('#save-modal .modal-content');
        let errorDiv = modalContent.querySelector('.modal-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'modal-error';
            errorDiv.style.cssText = 'background: #fed7d7; border: 1px solid #fc8181; color: #c53030; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 14px;';
            modalContent.insertBefore(errorDiv, modalContent.querySelector('.button-group'));
        }
        errorDiv.textContent = message;
        setTimeout(() => errorDiv.remove(), 3000);
    }

    showSuccess(message) {
        const resultsDiv = document.getElementById('results');
        const successDiv = document.createElement('div');
        successDiv.className = 'result-box success';
        successDiv.innerHTML = `<h4>✅ Success</h4><div>${message}</div>`;
        resultsDiv.appendChild(successDiv);
        
        // Auto-remove success message after 3 seconds
        setTimeout(() => successDiv.remove(), 3000);
    }

    loadSavedExpressions() {
        const expressions = this.getSavedExpressions();
        const listDiv = document.getElementById('expressions-list');
        
        if (expressions.length === 0) {
            listDiv.innerHTML = '<p style="color: #718096; font-style: italic;">No saved expressions yet.</p>';
            return;
        }

        listDiv.innerHTML = expressions.map(expr => `
            <div class="expression-item">
                <div class="expression-info">
                    <div class="expression-name">${this.escapeHtml(expr.name)}</div>
                    <div class="expression-preview">${this.escapeHtml(expr.expression)}</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;">
                    <button onclick="compiler.loadExpression('${this.escapeHtml(expr.name)}')" class="secondary-btn" style="padding: 4px 8px; font-size: 10px;">Load</button>
                    <button onclick="compiler.deleteExpression('${this.escapeHtml(expr.name)}')" class="danger-btn" style="padding: 4px 8px; font-size: 10px;">Del</button>
                </div>
            </div>
        `).join('');
    }

    loadExpression(name) {
        const expressions = this.getSavedExpressions();
        const savedExpr = expressions.find(expr => expr.name === name);
        
        if (savedExpr) {
            document.getElementById('expression-input').value = savedExpr.expression;
            
            // Auto-detect context based on key formats in the expression
            const detectedContext = this.detectContextFromExpression(savedExpr.expression);
            const context = detectedContext || savedExpr.context || 'segwit';
            document.querySelector(`input[name="context"][value="${context}"]`).checked = true;
            
            // Clear previous results and messages
            document.getElementById('results').innerHTML = '';
            this.clearMiniscriptMessages();
            
            // Hide description panel
            const miniscriptPanel = document.querySelector('.miniscript-description-panel');
            if (miniscriptPanel) miniscriptPanel.style.display = 'none';
            
            // Reset the "Show key names" checkbox
            const checkbox = document.getElementById('replace-keys-checkbox');
            if (checkbox) {
                checkbox.checked = false;
            }
        }
    }

    deleteExpression(name) {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) {
            return;
        }

        const expressions = this.getSavedExpressions();
        const filteredExpressions = expressions.filter(expr => expr.name !== name);
        this.setSavedExpressions(filteredExpressions);
        this.loadSavedExpressions();
    }

    getSavedExpressions() {
        try {
            const saved = localStorage.getItem('miniscript-expressions');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load saved expressions:', error);
            return [];
        }
    }

    setSavedExpressions(expressions) {
        try {
            localStorage.setItem('miniscript-expressions', JSON.stringify(expressions));
        } catch (error) {
            console.error('Failed to save expressions:', error);
            alert('Failed to save expression. Local storage might be full.');
        }
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    simplifyAsm(scriptAsm) {
        // Remove only the pushbytes operations, keep the hex data (keys) and other ops
        return scriptAsm
            .replace(/OP_PUSHBYTES_\d+\s+/g, '')
            .replace(/OP_PUSHDATA\d?\s+/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    detectContextFromExpression(expression) {
        // First check for direct hex keys in the expression
        const hexPattern = /[0-9a-fA-F]{64,66}/g;
        const hexMatches = expression.match(hexPattern);
        
        // Also check for key variable names that might reference our known keys
        const keyVariablePattern = /[A-Za-z_][A-Za-z0-9_]*/g;
        const variableMatches = expression.match(keyVariablePattern);
        
        let hasXOnlyKeys = false;
        let hasCompressedKeys = false;
        
        // Check direct hex keys
        if (hexMatches) {
            for (const match of hexMatches) {
                if (match.length === 64) {
                    hasXOnlyKeys = true;
                } else if (match.length === 66 && (match.startsWith('02') || match.startsWith('03'))) {
                    hasCompressedKeys = true;
                }
            }
        }
        
        // Check key variable names against our known keys
        if (variableMatches && this.keyVariables) {
            for (const variable of variableMatches) {
                if (this.keyVariables.has(variable)) {
                    const keyValue = this.keyVariables.get(variable);
                    if (keyValue.length === 64) {
                        hasXOnlyKeys = true;
                    } else if (keyValue.length === 66 && (keyValue.startsWith('02') || keyValue.startsWith('03'))) {
                        hasCompressedKeys = true;
                    }
                }
            }
        }
        
        // Determine context based on key types found
        if (hasXOnlyKeys && !hasCompressedKeys) {
            return 'taproot';
        } else if (hasCompressedKeys && !hasXOnlyKeys) {
            // For compressed keys, default to segwit (user can manually switch to legacy if needed)
            return 'segwit';
        } else if (hasXOnlyKeys && hasCompressedKeys) {
            // Mixed key types - this is unusual, default to segwit
            return 'segwit';
        }
        
        return null; // No clear determination
    }

    // Policy saving methods (identical to expression saving)
    showSavePolicyModal() {
        const policy = document.getElementById('policy-input').value.trim();
        if (!policy) {
            this.showPolicyError('Please enter a policy to save.');
            return;
        }
        
        document.getElementById('save-policy-modal').style.display = 'block';
        document.getElementById('save-policy-name').focus();
    }

    hideSavePolicyModal() {
        document.getElementById('save-policy-modal').style.display = 'none';
        document.getElementById('save-policy-name').value = '';
        // Remove any existing error messages
        const errorDiv = document.querySelector('#save-policy-modal .modal-error');
        if (errorDiv) errorDiv.remove();
    }

    savePolicy() {
        const name = document.getElementById('save-policy-name').value.trim();
        const policy = document.getElementById('policy-input').value.trim();

        if (!name) {
            this.showPolicyModalError('Please enter a name for the policy.');
            return;
        }

        if (name.length > 50) {
            this.showPolicyModalError('Policy name must be 50 characters or less.');
            return;
        }

        if (!policy) {
            this.showPolicyModalError('No policy to save.');
            return;
        }

        // Get existing policies
        const savedPolicies = this.getSavedPolicies();
        
        // Check storage limits (keep max 20 policies)
        if (savedPolicies.length >= 20 && !savedPolicies.some(pol => pol.name === name)) {
            this.showPolicyModalError('Maximum 20 policies allowed. Please delete some first.');
            return;
        }
        
        // Check if name already exists
        if (savedPolicies.some(pol => pol.name === name)) {
            if (!confirm(`A policy named "${this.escapeHtml(name)}" already exists. Overwrite?`)) {
                return;
            }
            // Remove existing
            savedPolicies.splice(savedPolicies.findIndex(pol => pol.name === name), 1);
        }

        // Add new policy with context
        const context = document.querySelector('input[name="context"]:checked').value;
        savedPolicies.push({
            name: name,
            expression: policy,
            context: context,
            timestamp: new Date().toISOString()
        });

        // Save to localStorage
        this.setSavedPolicies(savedPolicies);
        
        // Refresh the list
        this.loadSavedPolicies();
        
        // Hide modal
        this.hideSavePolicyModal();
        
        // Show success message
        this.showSuccess(`Policy "${this.escapeHtml(name)}" has been saved!`);
    }

    showPolicyModalError(message) {
        const modalContent = document.querySelector('#save-policy-modal .modal-content');
        let errorDiv = modalContent.querySelector('.modal-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'modal-error';
            errorDiv.style.cssText = 'background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text); padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 14px;';
            modalContent.insertBefore(errorDiv, modalContent.querySelector('.button-group'));
        }
        errorDiv.textContent = message;
        setTimeout(() => errorDiv.remove(), 3000);
    }

    loadSavedPolicies() {
        const policies = this.getSavedPolicies();
        const listDiv = document.getElementById('policies-list');
        
        if (policies.length === 0) {
            listDiv.innerHTML = '<p style="color: var(--text-muted); font-style: italic; font-size: 14px;">No saved policies yet.</p>';
            return;
        }

        listDiv.innerHTML = policies.map(policy => `
            <div class="expression-item">
                <div class="expression-info">
                    <div class="expression-name">${this.escapeHtml(policy.name)}</div>
                    <div class="expression-preview">${this.escapeHtml(policy.expression)}</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;">
                    <button onclick="compiler.loadPolicy('${this.escapeHtml(policy.name)}')" class="secondary-btn" style="padding: 4px 8px; font-size: 10px;">Load</button>
                    <button onclick="compiler.deletePolicy('${this.escapeHtml(policy.name)}')" class="danger-btn" style="padding: 4px 8px; font-size: 10px;">Del</button>
                </div>
            </div>
        `).join('');
    }

    loadPolicy(name) {
        const policies = this.getSavedPolicies();
        const savedPolicy = policies.find(policy => policy.name === name);
        
        if (savedPolicy) {
            document.getElementById('policy-input').value = savedPolicy.expression;
            
            // Auto-detect context based on key formats in the policy
            const detectedContext = this.detectContextFromExpression(savedPolicy.expression);
            const context = detectedContext || savedPolicy.context || 'segwit';
            document.querySelector(`input[name="context"][value="${context}"]`).checked = true;
            
            // Clear previous results
            document.getElementById('results').innerHTML = '';
            this.clearPolicyErrors();
            
            // Hide description panel
            const policyPanel = document.querySelector('.policy-description-panel');
            if (policyPanel) policyPanel.style.display = 'none';
            
            // Reset the "Show key names" checkbox
            const checkbox = document.getElementById('replace-keys-checkbox');
            if (checkbox) {
                checkbox.checked = false;
            }
        }
    }

    deletePolicy(name) {
        if (!confirm(`Are you sure you want to delete policy "${name}"?`)) {
            return;
        }

        const policies = this.getSavedPolicies();
        const filteredPolicies = policies.filter(policy => policy.name !== name);
        this.setSavedPolicies(filteredPolicies);
        this.loadSavedPolicies();
    }

    getSavedPolicies() {
        try {
            const saved = localStorage.getItem('miniscript-policies');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load saved policies:', error);
            return [];
        }
    }

    setSavedPolicies(policies) {
        try {
            localStorage.setItem('miniscript-policies', JSON.stringify(policies));
        } catch (error) {
            console.error('Failed to save policies:', error);
            alert('Failed to save policy. Local storage might be full.');
        }
    }
}

// Initialize the compiler
const compiler = new MiniscriptCompiler();

// Make compiler globally available for onclick handlers
window.compiler = compiler;

// Global function for generate key button
window.generateKey = function() {
    console.log('Global generateKey called');
    if (window.compiler && typeof window.compiler.generateKey === 'function') {
        window.compiler.generateKey();
    } else {
        console.error('Compiler or generateKey method not available');
    }
};

// Global function to load examples
window.loadExample = function(example) {
    document.getElementById('expression-input').value = example;
    document.getElementById('results').innerHTML = '';
    if (window.compiler && window.compiler.clearMiniscriptMessages) {
        window.compiler.clearMiniscriptMessages();
    }
    
    // Auto-detect context based on key formats in the example (only if compiler is ready)
    if (window.compiler && window.compiler.detectContextFromExpression) {
        const detectedContext = window.compiler.detectContextFromExpression(example);
        const context = detectedContext || 'segwit';
        document.querySelector(`input[name="context"][value="${context}"]`).checked = true;
    }
    
    // Reset the "Show key names" checkbox
    const checkbox = document.getElementById('replace-keys-checkbox');
    if (checkbox) {
        checkbox.checked = false;
    }
};

// Global function to load policy examples
window.loadPolicyExample = function(example) {
    document.getElementById('policy-input').value = example;
    document.getElementById('expression-input').value = '';
    document.getElementById('results').innerHTML = '';
    document.getElementById('policy-errors').innerHTML = '';
    
    // Auto-detect context based on key formats in the example (only if compiler is ready)
    if (window.compiler && window.compiler.detectContextFromExpression) {
        const detectedContext = window.compiler.detectContextFromExpression(example);
        const context = detectedContext || 'segwit';
        document.querySelector(`input[name="context"][value="${context}"]`).checked = true;
    }
    
    // Reset the "Show key names" checkbox since we cleared the miniscript
    const checkbox = document.getElementById('replace-keys-checkbox');
    if (checkbox) {
        checkbox.checked = false;
    }
};

// Global function to show policy descriptions
window.showPolicyDescription = function(exampleId) {
    const panel = document.getElementById('policy-description');
    const contentDiv = panel.querySelector('.description-content');
    
    const descriptions = {
        'single': {
            title: '📄 Single Key Policy',
            conditions: '🔓 Alice: Immediate spending (no restrictions)',
            useCase: 'Personal wallet with single owner. Simple and efficient for individual use.',
            security: '⚠️ Single point of failure - if Alice loses her key, funds are lost'
        },
        'or': {
            title: '📄 OR Keys Policy',
            conditions: '🔓 Alice: Can spend immediately\n🔓 Bob: Can spend immediately',
            useCase: 'Shared wallet where either party can spend. Useful for joint accounts or backup access.',
            security: '💡 Either key compromise results in fund loss'
        },
        'and': {
            title: '📄 AND Keys Policy',
            conditions: '🔓 Alice + Bob: Both signatures required',
            useCase: '2-of-2 multisig. Both parties must agree to spend. Common for business partnerships.',
            security: '💡 More secure but requires cooperation of both parties'
        },
        'threshold': {
            title: '📄 2-of-3 Threshold Policy',
            conditions: '🔓 Any 2 of: Alice, Bob, Charlie',
            useCase: 'Board of directors or family trust. Prevents single point of failure while requiring majority.',
            security: '💡 Balanced security - survives 1 key loss, prevents 1 key compromise'
        },
        'timelock': {
            title: '📄 Timelock Policy',
            conditions: '🔓 Alice: Immediate spending\n⏰ Bob: After 144 blocks (~1 day)',
            useCase: 'Emergency access with delay. Alice has daily control, Bob can recover after waiting period.',
            security: '💡 Cooling-off period prevents rushed decisions'
        },
        'xonly': {
            title: '📄 Taproot X-only Key',
            conditions: '🔓 David: Immediate spending (Taproot context)',
            useCase: 'Demonstrates Taproot X-only public keys (64 characters). More efficient and private.',
            security: '💡 Taproot provides better privacy and efficiency'
        },
        'corporate': {
            title: '📄 Corporate Wallet Policy',
            conditions: '🔓 Any 2 of: Alice, Bob, Charlie (board)\n⏰ Eve (CEO): After January 1, 2025',
            useCase: 'Corporate treasury with board oversight and emergency CEO access after specific date.',
            security: '💡 Board control with time-delayed executive override'
        },
        'recovery': {
            title: '📄 Emergency Recovery Policy',
            conditions: '🔓 Alice: Immediate spending (95% probability weight)\n⏰ Bob + Charlie + Eve: 2-of-3 after 1008 blocks (~1 week)',
            useCase: 'Personal wallet with family/friends emergency recovery. Alice controls daily, family can recover if needed. The 95@ weight tells miniscript compiler to optimize for Alice\'s path.',
            security: '💡 Probability weight helps wallets optimize fees and witness sizes for common usage'
        },
        'twofa': {
            title: '📄 2FA + Backup Policy',
            conditions: '🔓 Alice + (Bob + secret OR wait 1 year)',
            useCase: 'Two-factor authentication wallet. Alice + second device, or Alice alone after 1 year backup delay.',
            security: '💡 Strong 2FA security with long-term recovery option'
        },
        'inheritance': {
            title: '📄 Taproot Inheritance Policy',
            conditions: '🔓 David: Immediate spending\n⏰ Helen + Ivan + Julia: 2-of-3 after 26280 blocks (~6 months)',
            useCase: 'Estate planning. David controls funds, beneficiaries can inherit after extended waiting period.',
            security: '💡 Long delay ensures David has opportunity to intervene'
        },
        'delayed': {
            title: '📄 Taproot 2-of-2 OR Delayed',
            conditions: '🔓 Julia + Karl: Immediate 2-of-2 spending\n⏰ David: After 144 blocks (~1 day)',
            useCase: 'Joint account with single-party emergency access. Both parties agree, or one party after delay.',
            security: '💡 Cooperative control with individual fallback'
        }
    };
    
    const desc = descriptions[exampleId];
    if (desc) {
        contentDiv.innerHTML = `
            <h5 style="margin: 0 0 12px 0; color: var(--accent-color); font-size: 14px;">${desc.title}</h5>
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-color); font-size: 12px;">Spending Conditions:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); white-space: pre-line;">${desc.conditions}</div>
            </div>
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-color); font-size: 12px;">Use Case:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); line-height: 1.4;">${desc.useCase}</div>
            </div>
            <div>
                <strong style="color: var(--text-color); font-size: 12px;">Security Notes:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); line-height: 1.4;">${desc.security}</div>
            </div>
        `;
        panel.style.display = 'block';
    }
};

// Global function to show miniscript descriptions
window.showMiniscriptDescription = function(exampleId) {
    const panel = document.getElementById('miniscript-description');
    const contentDiv = panel.querySelector('.description-content');
    
    const descriptions = {
        'single': {
            title: '⚙️ Single Key Miniscript',
            structure: 'pk(Alice) → Direct public key check',
            bitcoinScript: 'Compiles to: <Alice> CHECKSIG',
            useCase: 'Simplest miniscript - requires a signature from Alice to spend.',
            technical: '💡 Most efficient single-key pattern'
        },
        'and': {
            title: '⚙️ 2-of-2 AND Miniscript',
            structure: 'and_v(v:pk(Alice),pk(Bob)) → Verify Alice, then check Bob',
            bitcoinScript: 'Compiles to: <Alice> CHECKSIGVERIFY <Bob> CHECKSIG',
            useCase: 'Both Alice and Bob must provide signatures. Common for joint accounts or business partnerships.',
            technical: '💡 Uses VERIFY wrapper for efficient sequential checking'
        },
        'or': {
            title: '⚙️ OR Keys Miniscript',
            structure: 'or_b(pk(Alice),s:pk(Bob)) → Boolean OR with stack swap',
            bitcoinScript: 'Compiles to: <Alice> CHECKSIG SWAP <Bob> CHECKSIG BOOLOR',
            useCase: 'Either Alice or Bob can spend. Useful for backup access or shared control.',
            technical: '💡 s: wrapper swaps stack elements for proper evaluation'
        },
        'complex': {
            title: '⚙️ Complex AND/OR Miniscript',
            structure: 'and_v(v:pk(Alice),or_b(pk(Bob),s:pk(Charlie))) → Alice AND (Bob OR Charlie)',
            bitcoinScript: 'Alice verified first, then Bob OR Charlie evaluated',
            useCase: 'Alice must always sign, plus either Bob or Charlie. Useful for primary + backup authorization.',
            technical: '💡 Nested structure demonstrates miniscript composition'
        },
        'timelock': {
            title: '⚙️ Timelock Miniscript',
            structure: 'and_v(v:pk(Alice),and_v(v:older(144),pk(Bob))) → Alice AND (144 blocks + Bob)',
            bitcoinScript: 'Verifies Alice, then checks timelock and Bob signature',
            useCase: 'Alice must sign, plus Bob can only sign after 144 blocks (~1 day). Prevents rushed decisions.',
            technical: '💡 Relative timelock using CSV (CHECKSEQUENCEVERIFY)'
        },
        'xonly': {
            title: '⚙️ Taproot X-only Key',
            structure: 'pk(David) → X-only public key (64 chars)',
            bitcoinScript: 'Compiles to Taproot-compatible script using 32-byte keys',
            useCase: 'Demonstrates Taproot X-only public keys for improved efficiency and privacy.',
            technical: '💡 Taproot uses Schnorr signatures with X-only keys'
        },
        'multisig': {
            title: '⚙️ 1-of-3 Multisig Miniscript',
            structure: 'or_d(pk(Alice),or_d(pk(Bob),pk(Charlie))) → Nested OR with DUP',
            bitcoinScript: 'Conditional execution using DUP IF pattern for each branch',
            useCase: 'Any of three parties can spend. More flexible than traditional CHECKMULTISIG.',
            technical: '💡 or_d uses DUP IF for efficient conditional branching'
        },
        'recovery': {
            title: '⚙️ Recovery Wallet Miniscript',
            structure: 'or_d(pk(Alice),and_v(v:pk(Bob),older(1008))) → Alice OR (Bob + delay)',
            bitcoinScript: 'Alice immediate, or Bob after 1008 blocks verification',
            useCase: 'Alice has daily control, Bob can recover funds after ~1 week waiting period.',
            technical: '💡 Combines immediate access with time-delayed recovery'
        },
        'hash': {
            title: '⚙️ Hash + Timelock Miniscript',
            structure: 'and_v(v:pk(Alice),or_d(pk(Bob),and_v(v:hash160(...),older(144))))',
            bitcoinScript: 'Alice AND (Bob OR (secret + timelock))',
            useCase: 'Alice + Bob normally, or Alice + secret after delay. Two-factor authentication pattern.',
            technical: '💡 hash160 requires RIPEMD160(SHA256(preimage))'
        },
        'inheritance': {
            title: '⚙️ Taproot Inheritance Miniscript',
            structure: 'and_v(v:pk(David),or_d(pk(Helen),and_v(v:pk(Ivan),older(52560))))',
            bitcoinScript: 'David AND (Helen OR (Ivan + 1 year))',
            useCase: 'David controls funds, Helen can inherit immediately, or Ivan after extended delay.',
            technical: '💡 Long timelock (52560 blocks ≈ 1 year) for inheritance planning'
        },
        'delayed': {
            title: '⚙️ Taproot Immediate OR Delayed',
            structure: 'or_d(pk(Julia),and_v(v:pk(Karl),older(144))) → Julia OR (Karl + delay)',
            bitcoinScript: 'Julia immediate OR Karl after 144 blocks',
            useCase: 'Julia can spend immediately, Karl can spend after 1-day cooling period.',
            technical: '💡 Demonstrates Taproot miniscript with short timelock'
        }
    };
    
    const desc = descriptions[exampleId];
    if (desc) {
        contentDiv.innerHTML = `
            <h5 style="margin: 0 0 12px 0; color: var(--accent-color); font-size: 14px;">${desc.title}</h5>
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-color); font-size: 12px;">Structure:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); line-height: 1.4; font-family: monospace; background: var(--hover-bg); padding: 6px; border-radius: 4px;">${desc.structure}</div>
            </div>
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-color); font-size: 12px;">Bitcoin Script:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); line-height: 1.4;">${desc.bitcoinScript}</div>
            </div>
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-color); font-size: 12px;">Use Case:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); line-height: 1.4;">${desc.useCase}</div>
            </div>
            <div>
                <strong style="color: var(--text-color); font-size: 12px;">Technical Notes:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); line-height: 1.4;">${desc.technical}</div>
            </div>
        `;
        panel.style.display = 'block';
    }
};

// Global function to handle replace keys checkbox
window.handleReplaceKeysChange = function(isChecked) {
    console.log('Global handleReplaceKeysChange called with:', isChecked);
    if (window.compiler && typeof window.compiler.handleReplaceKeysToggle === 'function') {
        window.compiler.handleReplaceKeysToggle(isChecked);
    } else {
        console.error('Compiler or handleReplaceKeysToggle method not available');
    }
};

// Make description functions globally available
window.showPolicyDescription = function(exampleId) {
    const panel = document.getElementById('policy-description');
    const contentDiv = panel.querySelector('.description-content');
    
    const descriptions = {
        'single': {
            title: '📄 Single Key Policy',
            conditions: '🔓 Alice: Immediate spending (no restrictions)',
            useCase: 'Personal wallet with single owner. Simple and efficient for individual use.',
            security: '⚠️ Single point of failure - if Alice loses her key, funds are lost'
        },
        'or': {
            title: '📄 OR Keys Policy',
            conditions: '🔓 Alice: Can spend immediately\n🔓 Bob: Can spend immediately',
            useCase: 'Shared wallet where either party can spend. Useful for joint accounts or backup access.',
            security: '💡 Either key compromise results in fund loss'
        },
        'and': {
            title: '📄 AND Keys Policy',
            conditions: '🔓 Alice + Bob: Both signatures required',
            useCase: '2-of-2 multisig. Both parties must agree to spend. Common for business partnerships.',
            security: '💡 More secure but requires cooperation of both parties'
        },
        'threshold': {
            title: '📄 2-of-3 Threshold Policy',
            conditions: '🔓 Any 2 of: Alice, Bob, Charlie',
            useCase: 'Board of directors or family trust. Prevents single point of failure while requiring majority.',
            security: '💡 Balanced security - survives 1 key loss, prevents 1 key compromise'
        },
        'timelock': {
            title: '📄 Timelock Policy',
            conditions: '🔓 Alice: Immediate spending\n⏰ Bob: After 144 blocks (~1 day)',
            useCase: 'Emergency access with delay. Alice has daily control, Bob can recover after waiting period.',
            security: '💡 Cooling-off period prevents rushed decisions'
        },
        'xonly': {
            title: '📄 Taproot X-only Key',
            conditions: '🔓 David: Immediate spending (Taproot context)',
            useCase: 'Demonstrates Taproot X-only public keys (64 characters). More efficient and private.',
            security: '💡 Taproot provides better privacy and efficiency'
        },
        'corporate': {
            title: '📄 Corporate Wallet Policy',
            conditions: '🔓 Any 2 of: Alice, Bob, Charlie (board)\n⏰ Eve (CEO): After January 1, 2025',
            useCase: 'Corporate treasury with board oversight and emergency CEO access after specific date.',
            security: '💡 Board control with time-delayed executive override'
        },
        'recovery': {
            title: '📄 Emergency Recovery Policy',
            conditions: '🔓 Alice: Immediate spending (95% probability weight)\n⏰ Bob + Charlie + Eve: 2-of-3 after 1008 blocks (~1 week)',
            useCase: 'Personal wallet with family/friends emergency recovery. Alice controls daily, family can recover if needed. The 95@ weight tells miniscript compiler to optimize for Alice\'s path.',
            security: '💡 Probability weight helps wallets optimize fees and witness sizes for common usage'
        },
        'twofa': {
            title: '📄 2FA + Backup Policy',
            conditions: '🔓 Alice + (Bob + secret OR wait 1 year)',
            useCase: 'Two-factor authentication wallet. Alice + second device, or Alice alone after 1 year backup delay.',
            security: '💡 Strong 2FA security with long-term recovery option'
        },
        'inheritance': {
            title: '📄 Taproot Inheritance Policy',
            conditions: '🔓 David: Immediate spending\n⏰ Helen + Ivan + Julia: 2-of-3 after 26280 blocks (~6 months)',
            useCase: 'Estate planning. David controls funds, beneficiaries can inherit after extended waiting period.',
            security: '💡 Long delay ensures David has opportunity to intervene'
        },
        'delayed': {
            title: '📄 Taproot 2-of-2 OR Delayed',
            conditions: '🔓 Julia + Karl: Immediate 2-of-2 spending\n⏰ David: After 144 blocks (~1 day)',
            useCase: 'Joint account with single-party emergency access. Both parties agree, or one party after delay.',
            security: '💡 Cooperative control with individual fallback'
        }
    };
    
    const desc = descriptions[exampleId];
    if (desc) {
        contentDiv.innerHTML = `
            <h5 style="margin: 0 0 12px 0; color: var(--accent-color); font-size: 14px;">${desc.title}</h5>
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-color); font-size: 12px;">Spending Conditions:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); white-space: pre-line;">${desc.conditions}</div>
            </div>
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-color); font-size: 12px;">Use Case:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); line-height: 1.4;">${desc.useCase}</div>
            </div>
            <div>
                <strong style="color: var(--text-color); font-size: 12px;">Security Notes:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); line-height: 1.4;">${desc.security}</div>
            </div>
        `;
        panel.style.display = 'block';
    }
};

window.showMiniscriptDescription = function(exampleId) {
    const panel = document.getElementById('miniscript-description');
    const contentDiv = panel.querySelector('.description-content');
    
    const descriptions = {
        'single': {
            title: '⚙️ Single Key Miniscript',
            structure: 'pk(Alice) → Direct public key check',
            bitcoinScript: 'Compiles to: <Alice> CHECKSIG',
            useCase: 'Simplest miniscript - requires a signature from Alice to spend.',
            technical: '💡 Most efficient single-key pattern'
        },
        'and': {
            title: '⚙️ 2-of-2 AND Miniscript',
            structure: 'and_v(v:pk(Alice),pk(Bob)) → Verify Alice, then check Bob',
            bitcoinScript: 'Compiles to: <Alice> CHECKSIGVERIFY <Bob> CHECKSIG',
            useCase: 'Both Alice and Bob must provide signatures. Common for joint accounts or business partnerships.',
            technical: '💡 Uses VERIFY wrapper for efficient sequential checking'
        },
        'or': {
            title: '⚙️ OR Keys Miniscript',
            structure: 'or_b(pk(Alice),s:pk(Bob)) → Boolean OR with stack swap',
            bitcoinScript: 'Compiles to: <Alice> CHECKSIG SWAP <Bob> CHECKSIG BOOLOR',
            useCase: 'Either Alice or Bob can spend. Useful for backup access or shared control.',
            technical: '💡 s: wrapper swaps stack elements for proper evaluation'
        },
        'complex': {
            title: '⚙️ Complex AND/OR Miniscript',
            structure: 'and_v(v:pk(Alice),or_b(pk(Bob),s:pk(Charlie))) → Alice AND (Bob OR Charlie)',
            bitcoinScript: 'Alice verified first, then Bob OR Charlie evaluated',
            useCase: 'Alice must always sign, plus either Bob or Charlie. Useful for primary + backup authorization.',
            technical: '💡 Nested structure demonstrates miniscript composition'
        },
        'timelock': {
            title: '⚙️ Timelock Miniscript',
            structure: 'and_v(v:pk(Alice),and_v(v:older(144),pk(Bob))) → Alice AND (144 blocks + Bob)',
            bitcoinScript: 'Verifies Alice, then checks timelock and Bob signature',
            useCase: 'Alice must sign, plus Bob can only sign after 144 blocks (~1 day). Prevents rushed decisions.',
            technical: '💡 Relative timelock using CSV (CHECKSEQUENCEVERIFY)'
        },
        'xonly': {
            title: '⚙️ Taproot X-only Key',
            structure: 'pk(David) → X-only public key (64 chars)',
            bitcoinScript: 'Compiles to Taproot-compatible script using 32-byte keys',
            useCase: 'Demonstrates Taproot X-only public keys for improved efficiency and privacy.',
            technical: '💡 Taproot uses Schnorr signatures with X-only keys'
        },
        'multisig': {
            title: '⚙️ 1-of-3 Multisig Miniscript',
            structure: 'or_d(pk(Alice),or_d(pk(Bob),pk(Charlie))) → Nested OR with DUP',
            bitcoinScript: 'Conditional execution using DUP IF pattern for each branch',
            useCase: 'Any of three parties can spend. More flexible than traditional CHECKMULTISIG.',
            technical: '💡 or_d uses DUP IF for efficient conditional branching'
        },
        'recovery': {
            title: '⚙️ Recovery Wallet Miniscript',
            structure: 'or_d(pk(Alice),and_v(v:pk(Bob),older(1008))) → Alice OR (Bob + delay)',
            bitcoinScript: 'Alice immediate, or Bob after 1008 blocks verification',
            useCase: 'Alice has daily control, Bob can recover funds after ~1 week waiting period.',
            technical: '💡 Combines immediate access with time-delayed recovery'
        },
        'hash': {
            title: '⚙️ Hash + Timelock Miniscript',
            structure: 'and_v(v:pk(Alice),or_d(pk(Bob),and_v(v:hash160(...),older(144))))',
            bitcoinScript: 'Alice AND (Bob OR (secret + timelock))',
            useCase: 'Alice + Bob normally, or Alice + secret after delay. Two-factor authentication pattern.',
            technical: '💡 hash160 requires RIPEMD160(SHA256(preimage))'
        },
        'inheritance': {
            title: '⚙️ Taproot Inheritance Miniscript',
            structure: 'and_v(v:pk(David),or_d(pk(Helen),and_v(v:pk(Ivan),older(52560))))',
            bitcoinScript: 'David AND (Helen OR (Ivan + 1 year))',
            useCase: 'David controls funds, Helen can inherit immediately, or Ivan after extended delay.',
            technical: '💡 Long timelock (52560 blocks ≈ 1 year) for inheritance planning'
        },
        'delayed': {
            title: '⚙️ Taproot Immediate OR Delayed',
            structure: 'or_d(pk(Julia),and_v(v:pk(Karl),older(144))) → Julia OR (Karl + delay)',
            bitcoinScript: 'Julia immediate OR Karl after 144 blocks',
            useCase: 'Julia can spend immediately, Karl can spend after 1-day cooling period.',
            technical: '💡 Demonstrates Taproot miniscript with short timelock'
        }
    };
    
    const desc = descriptions[exampleId];
    if (desc) {
        contentDiv.innerHTML = `
            <h5 style="margin: 0 0 12px 0; color: var(--accent-color); font-size: 14px;">${desc.title}</h5>
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-color); font-size: 12px;">Structure:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); line-height: 1.4; font-family: monospace; background: var(--hover-bg); padding: 6px; border-radius: 4px;">${desc.structure}</div>
            </div>
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-color); font-size: 12px;">Bitcoin Script:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); line-height: 1.4;">${desc.bitcoinScript}</div>
            </div>
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-color); font-size: 12px;">Use Case:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); line-height: 1.4;">${desc.useCase}</div>
            </div>
            <div>
                <strong style="color: var(--text-color); font-size: 12px;">Technical Notes:</strong>
                <div style="margin-top: 4px; font-size: 12px; color: var(--secondary-text); line-height: 1.4;">${desc.technical}</div>
            </div>
        `;
        panel.style.display = 'block';
    }
};

// Global function to copy miniscript expression
window.copyMiniscriptExpression = function() {
    const expressionInput = document.getElementById('expression-input');
    const expression = expressionInput.value.trim();
    
    if (!expression) {
        alert('No expression to copy');
        return;
    }
    
    // Find the text span next to the button
    const button = event.target.closest('button');
    const textSpan = button.parentNode.querySelector('span');
    const originalText = textSpan.textContent;
    
    // Copy to clipboard
    navigator.clipboard.writeText(expression).then(() => {
        // Visual feedback - temporarily change text
        textSpan.textContent = 'Copied!';
        textSpan.style.color = 'var(--success-border)';
        
        setTimeout(() => {
            textSpan.textContent = originalText;
            textSpan.style.color = 'var(--text-secondary)';
        }, 1000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        expressionInput.select();
        document.execCommand('copy');
        
        // Visual feedback for fallback
        textSpan.textContent = 'Copied!';
        textSpan.style.color = 'var(--success-border)';
        
        setTimeout(() => {
            textSpan.textContent = originalText;
            textSpan.style.color = 'var(--text-secondary)';
        }, 1000);
    });
};

// Global function to copy policy expression
window.removePolicyExtraChars = function() {
    const policyInput = document.getElementById('policy-input');
    const policy = policyInput.value;
    
    if (!policy) {
        return;
    }
    
    // Remove spaces, carriage returns, and newlines
    const cleanedPolicy = policy.replace(/[\s\r\n]/g, '');
    policyInput.value = cleanedPolicy;
    
    // Show feedback
    const button = event.target.closest('button');
    const textSpan = button.parentElement.querySelector('span');
    const originalText = textSpan.textContent;
    textSpan.textContent = 'Cleaned!';
    setTimeout(() => {
        textSpan.textContent = originalText;
    }, 1000);
};

window.copyPolicyExpression = function() {
    const policyInput = document.getElementById('policy-input');
    const policy = policyInput.value.trim();
    
    if (!policy) {
        alert('No policy to copy');
        return;
    }
    
    // Find the text span next to the button
    const button = event.target.closest('button');
    const textSpan = button.parentNode.querySelector('span');
    const originalText = textSpan.textContent;
    
    // Copy to clipboard
    navigator.clipboard.writeText(policy).then(() => {
        // Visual feedback - temporarily change text
        textSpan.textContent = 'Copied!';
        textSpan.style.color = 'var(--success-border)';
        
        setTimeout(() => {
            textSpan.textContent = originalText;
            textSpan.style.color = 'var(--text-secondary)';
        }, 1000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        policyInput.select();
        document.execCommand('copy');
        
        // Visual feedback for fallback
        textSpan.textContent = 'Copied!';
        textSpan.style.color = 'var(--success-border)';
        
        setTimeout(() => {
            textSpan.textContent = originalText;
            textSpan.style.color = 'var(--text-secondary)';
        }, 1000);
    });
};