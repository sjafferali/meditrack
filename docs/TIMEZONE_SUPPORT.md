# Timezone Support in MediTrack

MediTrack now supports proper timezone handling to ensure medications are tracked according to the user's local time.

## How It Works

There are two ways to handle timezones in MediTrack:

### 1. Browser-Based Timezone (Recommended)

The application automatically detects and uses the browser's current timezone when:
- Recording new doses
- Determining what day it is for display
- Calculating daily dose limits

This happens automatically without any configuration needed.

### 2. Environment Variable Configuration

For server deployments or cases where you want to override the browser timezone, you can set a default timezone using an environment variable:

```bash
# In your .env file
TIMEZONE_OFFSET=-300  # For EST (UTC-5)
TIMEZONE_OFFSET=60    # For CET (UTC+1)
```

The offset is specified in minutes and follows JavaScript's convention (negative for west of UTC).

## Implementation Details

### Frontend Changes

1. Date comparisons now use local timezone:
   - `isToday()`, `isPastDate()`, and `isFutureDate()` functions use `toLocaleDateString()`
   
2. When recording doses, the frontend sends the browser's timezone offset:
   ```javascript
   const timezoneOffset = new Date().getTimezoneOffset();
   await doseApi.recordDoseWithTimezone(medicationId, timezoneOffset);
   ```

### Backend Changes

1. The `/doses/medications/{medication_id}/dose` endpoint now accepts an optional timezone offset:
   ```json
   {
     "timezone_offset": -300
   }
   ```

2. Daily summaries and dose counting respect the user's timezone

3. An optional `TIMEZONE_OFFSET` environment variable can be set as a fallback

## API Changes

### Recording a Dose with Timezone

```bash
POST /api/v1/doses/medications/1/dose
Content-Type: application/json

{
  "timezone_offset": -300
}
```

### Getting Daily Summary with Timezone

```bash
GET /api/v1/doses/daily-summary?timezone_offset=-300
```

## Testing

To test timezone support:

1. Change your browser's timezone in developer tools
2. Verify that "today" changes at midnight in your local timezone
3. Check that dose limits are calculated based on your local day
4. Confirm that dose timestamps are stored with proper timezone info

## Notes

- All timestamps are stored in UTC in the database
- The frontend displays times in the user's local timezone
- The backend respects timezone when calculating daily limits
- Past dates can still be recorded with specific times