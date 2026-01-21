# Changelog

## [Unreleased] - 2026-01-21

### Added

#### 1. Double Rest Timer Enhancement
- **Fixed**: Rest timer now doubles the **maximum rest time** instead of the current remaining time
- **Fixed**: Double rest can now be used **once per set** instead of once per exercise
- Users can extend rest time for challenging sets without losing the ability to extend on subsequent sets

#### 2. Input Box Behavior Improvement
- **Fixed**: Number input fields in workout configuration now stay **empty while typing**
- **Fixed**: Fields only default to zero when you **click away** from an empty field
- Eliminates the annoying "0" prefix when editing sets and reps values

#### 3. Rep Range Support
- **Added**: Reps field now supports **ranges** like "8-12" or "10-15"
- **Changed**: Database schema updated - `targetReps` changed from `int` to `varchar(20)`
- **Changed**: Input field changed from number to text with placeholder "e.g., 10 or 8-12"
- Allows for more flexible workout programming with rep ranges

#### 4. Custom Exercise Media Upload
- **Added**: Direct file upload support for images/GIFs and videos
- **Added**: New API endpoint `exercises.uploadMedia` for handling file uploads
- **Added**: Cloud storage integration for uploaded media files
- **Enhanced**: Exercise creation dialog now shows file upload inputs with preview
- Users can now upload media directly from their device instead of only pasting URLs
- Both upload and URL paste options are available for maximum flexibility

#### 5. Quick Exercise Creation from Search
- **Added**: "Create [exercise name]" button appears when searching for exercises that don't exist
- **Added**: Quick create button in WorkoutBuilder exercise picker
- **Added**: Quick create button in Exercises page when search returns no results
- **Enhanced**: Pre-fills exercise name when creating from search query
- Streamlines the workflow for adding custom exercises during workout building

#### 6. Progressive Overload Indicators
- **Added**: Personal Record (PR) tracking with outlier protection using IQR method
- **Added**: New database function `getPersonalRecord()` with statistical outlier filtering
- **Added**: New API endpoint `exercises.getPersonalRecord`
- **Added**: PR display card showing all-time best during active workouts
- **Added**: 🎉 Celebration toast notification when beating a personal record
- **Enhanced**: Shows both "Last time" and "Your PR" during workout sessions
- Helps users track progress and stay motivated by highlighting when they beat their all-time best

### Technical Details

#### Database Changes
- Modified `workoutExercises.targetReps` from `int` to `varchar(20)` to support rep ranges
- Added `getPersonalRecord()` function with IQR-based outlier detection (1.5 × IQR threshold)

#### API Changes
- Added `exercises.uploadMedia` mutation for file uploads
- Added `exercises.getPersonalRecord` query for PR tracking

#### UI/UX Improvements
- Better input field behavior prevents accidental zero values
- Visual PR indicator with trophy emoji and primary color highlighting
- Success notifications for PR achievements with 5-second duration
- File upload previews for images in exercise creation dialog

### Migration Notes
- Run `pnpm db:push` to apply database schema changes
- Existing `targetReps` values will be automatically converted to strings
- No data loss expected during migration

### Breaking Changes
None - all changes are backward compatible

---

## Previous Releases

See `todo.md` for the complete list of features implemented in previous versions.
