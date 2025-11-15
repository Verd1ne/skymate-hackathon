/**
 * Quick test script to verify setup
 */

const { exec } = require('child_process');

console.log('🧪 Testing setup...\n');

// Test 1: Check FFmpeg
console.log('1️⃣ Checking FFmpeg installation...');
exec('ffmpeg -version', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ FFmpeg not found. Please install FFmpeg:');
    console.log('   Windows: Download from https://ffmpeg.org/download.html');
    console.log('   Mac: brew install ffmpeg');
    console.log('   Linux: sudo apt-get install ffmpeg\n');
  } else {
    const version = stdout.split('\n')[0];
    console.log(`✅ FFmpeg installed: ${version}\n`);
  }
});

// Test 2: Check Node modules
console.log('2️⃣ Checking Node modules...');
try {
  require('@google-cloud/vision');
  console.log('✅ @google-cloud/vision installed');
} catch (e) {
  console.log('❌ @google-cloud/vision not found');
}

try {
  require('fluent-ffmpeg');
  console.log('✅ fluent-ffmpeg installed');
} catch (e) {
  console.log('❌ fluent-ffmpeg not found');
}

try {
  require('@google-cloud/video-intelligence');
  console.log('✅ @google-cloud/video-intelligence installed');
} catch (e) {
  console.log('❌ @google-cloud/video-intelligence not found');
}

try {
  require('@google-cloud/storage');
  console.log('✅ @google-cloud/storage installed\n');
} catch (e) {
  console.log('❌ @google-cloud/storage not found\n');
}

console.log('3️⃣ Setup verification complete!');
console.log('\nTo start the server:');
console.log('  npm run dev\n');

