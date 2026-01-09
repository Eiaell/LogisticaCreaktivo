const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1400, height: 900 });

    console.log('--- STARTING UI TEST ---');
    console.log('1. Navigating to Dashboard...');
    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    } catch (e) {
        console.error('Failed to load. Is the dev server running?');
        await browser.close();
        process.exit(1);
    }

    // Screenshot initial state
    await page.screenshot({ path: 'scripts/step1_initial_load.png' });

    console.log('2. Injecting Mock Data...');
    // Create a mock File object in the browser context and upload it
    await page.evaluate(() => {
        const dummyData = [
            {
                timestamp: "2024-01-01T10:00:00Z",
                actor: "Sistema",
                context: {
                    tipo: "test",
                    cliente: "Test Cliente",
                    producto: "Test Producto",
                    proveedor: "Test Proveedor",
                    precio: 100,
                    pagado: 0
                },
                artifacts: ["Proveedor:Test Proveedor", "Precio:100"]
            }
        ].map(o => JSON.stringify(o)).join('\n');

        const blob = new Blob([dummyData], { type: 'text/plain' });
        const file = new File([blob], 'test_data.jsonl', { type: 'text/plain' });

        const input = document.querySelector('input[type="file"]');
        if (input) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    // Wait for table to render
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'scripts/step2_data_loaded.png' });

    console.log('3. Checking "Proveedor" column...');
    const headers = await page.evaluate(() => Array.from(document.querySelectorAll('th')).map(th => th.innerText));
    console.log('Found Headers:', headers);

    if (headers.includes('Proveedor') || headers.includes('Vendedor/a')) {
        console.log('✅ Proveedor/Vendedor column FOUND.');
    } else {
        console.error('❌ Proveedor column NOT FOUND.');
    }

    if (!headers.includes('Adelanto')) {
        console.log('✅ Adelanto column GONE.');
    } else {
        console.error('❌ Adelanto column STILL PRESENT.');
    }

    console.log('4. Expanding Row for Payments...');
    // Find the expand button (contains '▼')
    const expandBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText.includes('▼'));
        if (btn) {
            btn.click();
            return true;
        }
        return false;
    });

    if (expandBtn) {
        console.log('   Clicked expand button.');
        await new Promise(r => setTimeout(r, 500)); // Wait for animation
        await page.screenshot({ path: 'scripts/step3_row_expanded.png' });

        // Check for "Registrar Pago" section (case insensitive)
        const bodyText = await page.evaluate(() => document.body.innerText.toUpperCase());
        if (bodyText.includes('REGISTRAR PAGO')) {
            console.log('✅ Payment Form VISIBLE successfully.');
        } else {
            console.error('❌ Payment Form NOT FOUND.');
        }
    } else {
        console.error('❌ Could not find expand button.');
    }

    await browser.close();
    console.log('--- TEST COMPLETE ---');
})();
