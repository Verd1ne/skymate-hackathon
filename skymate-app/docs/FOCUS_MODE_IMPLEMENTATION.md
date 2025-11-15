# Focus Mode Implementation - Seat Numbers & Items Only

## 🎯 Goal
Train/focus the model to ONLY recognize seat numbers and items, filtering out random words and improving number accuracy.

## ✅ Implemented Features

### 1. **Transcript Sanitization** ✅
- **Purpose**: Removes random words that don't match aviation vocabulary
- **Implementation**: `TranscriptSanitizer.sanitize()`
- **Features**:
  - Whitelist of aviation vocabulary (seat numbers, letters, actions, items)
  - Removes non-aviation words
  - Calculates noise ratio (percentage of removed words)
  - Logs removed words for debugging

### 2. **Structured Request Extraction** ✅
- **Purpose**: Extracts only the pattern: `[seat] [action] [item]`
- **Implementation**: `TranscriptSanitizer.extractStructuredRequest()`
- **Features**:
  - Pattern matching for seat + action + item
  - Handles various formats (with/without spaces, phonetic variants)
  - Returns null if no structured pattern found

### 3. **Enhanced Number Accuracy** ✅
- **Purpose**: Better extraction of seat numbers
- **Implementation**: `ContextAnalyzer.extractSeat()` with number word normalization
- **Features**:
  - Converts number words to digits (one → 1, thirty two → 32)
  - Validates seat numbers (1-60 range)
  - Multiple matching strategies (exact, space-separated, phonetic)
  - Strict validation of seat letter (A-F only)

### 4. **Noise Penalty Scoring** ✅
- **Purpose**: Penalize transcripts with too many random words
- **Implementation**: In `AlternativeScorer.scoreAlternative()`
- **Features**:
  - Calculates noise ratio
  - Penalty: `(noiseRatio - 0.3) * 0.5` if noise > 30%
  - Rejects alternatives with >50% noise

### 5. **Structure Bonus** ✅
- **Purpose**: Reward alternatives that match structured request pattern
- **Implementation**: In `AlternativeScorer.scoreAlternative()`
- **Features**:
  - +0.15 bonus if structured request found
  - Encourages selection of well-formed requests

### 6. **Increased Weights for Seat & Item** ✅
- **Purpose**: Prioritize seat numbers and items over other parts
- **Implementation**: Updated scoring weights
- **New Weights**:
  - Seat: **40%** (increased from 35%)
  - Item: **20%** (increased from 15%)
  - Action: **10%** (reduced from 15%)
  - Confidence: **25%** (reduced from 30%)

### 7. **Strict Validation Rules** ✅
- **Purpose**: Require both seat AND item for validity
- **Implementation**: In `processAllAlternatives()`
- **Features**:
  - Only accepts alternatives with seat AND item
  - Minimum seat score: 0.3
  - Minimum item score: 0.3
  - Rejects alternatives missing either component

### 8. **Enhanced Grammar** ✅
- **Purpose**: Focus Web Speech API on aviation vocabulary
- **Implementation**: Enhanced JSGF grammar
- **Features**:
  - Includes number words (one, two, thirty-two, etc.)
  - Includes phonetic variants (be, bee, sea, see, etc.)
  - Includes number misrecognitions (8, 6, 3, 5, 1)
  - Structured request pattern: `<seat> <action> [<article>] <item>`

### 9. **Aggressive Filtering** ✅
- **Purpose**: Reject alternatives with too much noise
- **Implementation**: In validation and selection
- **Features**:
  - Rejects if noise ratio > 50%
  - Requires seat score > 0.5 for low-confidence alternatives
  - Requires item score > 0.5 for low-confidence alternatives
  - Automatically requests re-listen if no valid alternatives

## 📊 How It Works

1. **Input**: User speaks "32 8 wants chicken meal"
2. **Sanitization**: Removes any random words not in aviation vocabulary
3. **Structured Extraction**: Extracts "32 8 wants chicken meal" pattern
4. **Number Normalization**: Converts to "32A wants chicken meal"
5. **Scoring**: 
   - Seat score: 1.0 (found 32A)
   - Item score: 1.0 (found chicken meal)
   - Noise penalty: 0 (no random words)
   - Structure bonus: +0.15
6. **Validation**: Checks seat (32A) and item (chicken meal) are valid
7. **Selection**: Chooses highest-scoring valid alternative

## 🎯 Success Metrics

The system now:
- ✅ Filters out random words automatically
- ✅ Focuses on seat numbers (1-60, A-F)
- ✅ Focuses on items (meals, beverages, comfort, assistance)
- ✅ Rejects transcripts with >50% noise
- ✅ Requires both seat AND item for acceptance
- ✅ Improves number accuracy with word-to-digit conversion
- ✅ Validates seat numbers strictly (1-60 range, A-F letters)

## 🔧 Configuration

### Noise Thresholds
- **Warning**: > 30% noise (applies penalty)
- **Rejection**: > 50% noise (marks as invalid)

### Minimum Scores
- **Seat score**: > 0.3 (for valid alternatives)
- **Item score**: > 0.3 (for valid alternatives)
- **Seat score**: > 0.5 (for low-confidence alternatives)
- **Item score**: > 0.5 (for low-confidence alternatives)

### Validation Rules
- **Required**: Seat number AND item
- **Optional**: Action verb (wants/needs)
- **Rejected**: Missing seat or item

## 📝 Example Outputs

### Before (with random words):
```
Input: "32 8 wants chicken meal and also some other stuff"
Output: "32A wants chicken meal" (random words removed)
```

### After (focused):
```
Input: "32 8 wants chicken"
Output: "32A wants chicken" (only seat + item extracted)
```

### Rejection (too much noise):
```
Input: "hello there 32 8 wants chicken meal please thank you very much"
Noise ratio: 60%
Action: REJECTED, requesting re-listen
```

## 🚀 Next Steps

1. **Monitor rejection rate** - If too many re-listens, lower thresholds
2. **Add user feedback** - Show what was rejected and why
3. **Expand vocabulary** - Add more item variations based on usage
4. **Fine-tune weights** - Adjust based on real-world accuracy metrics

