'use strict';
const assert=require('node:assert/strict');
const widths=[320,375,430,599,600,639,640,768,1023,1024,1439,1440,1920];
// Wait for the actual rendered viewport and layout, not networkidle.
async function checkResponsiveWidths(page, ready, label) {
  for(const width of widths) {
    await page.setViewportSize({width,height:900});
    await ready.waitFor({state:'visible',timeout:15000});
    await page.evaluate(async()=>{await document.fonts.ready; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    const dims=await page.evaluate(()=>({viewport:window.innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.equal(dims.viewport,width,label+' viewport mismatch');
    assert.ok(dims.scroll<=width+2,label+' horizontal overflow at '+width+' (scroll '+dims.scroll+')');
  }
  console.log('PASS responsive widths '+label+': '+widths.join(','));
}
module.exports={widths,checkResponsiveWidths};
