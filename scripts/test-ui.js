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

    if (headers.includes('Proveedor')) {
        console.log('✅ Proveedor column FOUND.');
    } else {
        console.error('❌ Proveedor column NOT FOUND.');
    }

    if (!headers.includes('Adelanto')) {
        console.log('✅ Adelanto column GONE.');
    } else {
        console.error('❌ Adelanto column STILL PRESENT.');
    }

    console.log('4. Opening Payments Modal...');
    // Click on the Pagado cell (should be 2nd to last column mostly) or find by text "S/.0.00"
    // We look for the cell containing 'S/.0'
    const cellClicked = await page.evaluate(() => {
        const cells = Array.from(document.querySelectorAll('td'));
        const payCell = cells.find(td => td.innerText.includes('S/.0') && td.querySelector('span.text-gray-500')); // Assuming grey for 0 paid
        if (payCell) {
            payCell.click();
            return true;
        }
        return false;
    });

    if (cellClicked) {
        console.log('   Clicked on a payment cell.');
        await new Promise(r => setTimeout(r, 500)); // Wait for animation
        await page.screenshot({ path: 'scripts/step3_modal_open.png' });

        // Check for modal text
        const modalText = await page.evaluate(() => document.body.innerText.includes('Gestionar Pagos'));
        if (modalText) {
            console.log('✅ Payments Modal OPENED successfully.');
        } else {
            console.error('❌ Payments Modal DID NOT open.');
        }
    } else {
        console.error('❌ Could not find a suitable payment cell to click.');
    }

    await browser.close();
    console.log('--- TEST COMPLETE ---');
})();
