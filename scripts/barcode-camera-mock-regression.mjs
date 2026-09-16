import fs from 'node:fs';

function fail(message){throw new Error(message)}
function inlineScripts(file){
  const html=fs.readFileSync(file,'utf8');
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
  if(!scripts.length)fail(file+' has no inline script.');
  scripts.forEach((source,i)=>{new Function(source);console.log('✓ '+file+' script '+(i+1)+' parses')});
  return html;
}

const admin=inlineScripts('src/AdminBarcodeCameraMockV958.html');
const scanner=inlineScripts('scanner/index.html');
const routes=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZ_V912_FinalRoutes.gs','utf8');

if(!admin.includes('https://nativeelaneeru.github.io/native-elaneeru-app/scanner/?v=958'))fail('Admin camera does not open the secure GitHub Pages scanner.');
if(!admin.includes("event.origin!==SCANNER_ORIGIN"))fail('Admin scanner message origin validation is missing.');
if(!admin.includes("data.type!=='NEL_BARCODE_SCAN_V958'"))fail('Admin scanner message type validation is missing.');
if(!admin.includes('startAdminBarcodeMockV958'))fail('Safe mock test entry point is missing.');
if(!admin.includes('No batch, order, stock or Google Sheet record will be created'))fail('Mock mode does not clearly state its no-write safety contract.');
if(/getUserMedia\s*\(/.test(admin))fail('Apps Script Admin must not call getUserMedia inside the sandbox.');
if(/createBatchV81|assignBatchV81|barcodeRpcV924/.test(admin))fail('Mock/camera enhancer must not contain production batch/order backend calls.');

if(!scanner.includes('navigator.mediaDevices.getUserMedia'))fail('External scanner camera capture is missing.');
if(!scanner.includes('BarcodeDetector'))fail('External scanner automatic barcode detection is missing.');
if(!scanner.includes("window.opener.postMessage({type:TYPE,barcode:raw},'*')"))fail('External scanner does not return barcode text to Admin.');
if(!scanner.includes('No image or video is uploaded'))fail('Scanner privacy message is missing.');

const barcodePos=routes.indexOf("AdminBarcodeV926");
const navPos=routes.indexOf("AdminNavigationV957");
const enhancerPos=routes.indexOf("AdminBarcodeCameraMockV958");
if(barcodePos<0||navPos<0||enhancerPos<0)fail('Admin barcode camera partial wiring is incomplete.');
if(!(barcodePos<navPos&&navPos<enhancerPos))fail('Admin barcode camera enhancer must load after Barcode and Admin Navigation.');

console.log('Barcode camera + safe mock regression passed: external camera only, validated postMessage return, and no production writes in mock mode.');