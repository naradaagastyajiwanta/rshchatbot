/**
 * Simple test for cleanAssistantResponse function
 */

const { cleanAssistantResponse } = require('./openai');

// Test cases
const testCases = [
  {
    name: 'Basic citation removal',
    input: 'Halo, ini adalah informasi penting【1:2†sumber】 yang perlu Anda ketahui.',
    expected: 'Halo, ini adalah informasi penting yang perlu Anda ketahui.'
  },
  {
    name: 'Multiple citations',
    input: 'Fakta pertama【1:3†sumber1】 dan fakta kedua【2:5†sumber2】 sangat penting.',
    expected: 'Fakta pertama dan fakta kedua sangat penting.'
  },
  {
    name: 'Citation at beginning',
    input: '【1:2†sumber】Informasi penting di awal kalimat.',
    expected: 'Informasi penting di awal kalimat.'
  },
  {
    name: 'Citation at end',
    input: 'Informasi penting di akhir kalimat【1:2†sumber】',
    expected: 'Informasi penting di akhir kalimat'
  },
  {
    name: 'Excess whitespace cleanup',
    input: 'Baris pertama\n\n\nBaris kedua\n\n\n\nBaris ketiga',
    expected: 'Baris pertama\nBaris kedua\nBaris ketiga'
  },
  {
    name: 'Combined citations and whitespace',
    input: 'Baris pertama【1:2†sumber1】\n\n\nBaris kedua【2:3†sumber2】\n\n\nBaris ketiga',
    expected: 'Baris pertama\nBaris kedua\nBaris ketiga'
  },
  {
    name: 'Empty input',
    input: '',
    expected: ''
  },
  {
    name: 'Null input',
    input: null,
    expected: ''
  }
];

// Run tests
let passCount = 0;
let failCount = 0;

console.log('Running cleanAssistantResponse tests...\n');
console.log('Using regex pattern: /【\d+:\d+†[^】]+】/g');


testCases.forEach((test, index) => {
  const result = cleanAssistantResponse(test.input);
  const passed = result === test.expected;
  
  if (passed) {
    passCount++;
    console.log(`✅ Test ${index + 1}: ${test.name} - PASSED`);
  } else {
    failCount++;
    console.log(`❌ Test ${index + 1}: ${test.name} - FAILED`);
    console.log(`   Input:    "${test.input}"`);
    console.log(`   Expected: "${test.expected}"`);
    console.log(`   Got:      "${result}"`);
  }
});

console.log(`\nTest Summary: ${passCount} passed, ${failCount} failed`);

if (failCount === 0) {
  console.log('All tests passed! The cleanAssistantResponse function is working correctly.');
} else {
  console.log('Some tests failed. Please review the function implementation.');
}
