# App Store Connect listing — draft

Draft copy for when you set up the app in App Store Connect. Edit freely — this is a
starting point, not final copy. Character limits noted are Apple's current limits.

## App name (30 chars max)
```
HouseParty
```

## Subtitle (30 chars max)
```
Find & host local parties
```

## Promotional text (170 chars max — editable anytime, no review needed)
```
Discover house parties and events near you, or host your own. Verified members, live
map, request-to-join booking, and two-way reviews.
```

## Description (4000 chars max)
```
HouseParty is the easiest way to discover — and host — small events and house parties
happening around you.

BROWSE A LIVE MAP
See what's happening nearby on a real-time map, or search and filter by category, price,
and date in Explore.

REQUEST TO JOIN
Found something you like? Send a request with your party size and a quick note. Hosts
review every request and accept or decline — no surprises, no crashers.

HOST YOUR OWN
List your event in minutes: photos, description, capacity, price, and an exact location
that's only shared with guests you've accepted.

VERIFIED COMMUNITY
Every host and guest completes ID verification before they can list or book an event,
reviewed by a real person — not just a checkbox.

TWO-WAY REVIEWS
After the event, hosts and guests rate each other, building a trust record that helps
everyone make better decisions next time.

STAY IN CONTROL
Report or block anyone, anytime. Delete your account and your data whenever you want.

HouseParty is for ages 18 and up.
```

## Keywords (100 chars max, comma-separated, no spaces after commas needed)
```
party,house party,events,social,meetup,host,nightlife,rooftop,gathering,rsvp
```

## Support URL
```
https://nippsss7.github.io/houseparty/
```
(Points at the Privacy Policy page, which lists a contact email. Consider a dedicated
support page/email alias before launch.)

## Marketing URL (optional)
```
https://nippsss7.github.io/houseparty/
```

## Privacy Policy URL (required)
```
https://nippsss7.github.io/houseparty/
```

## Category
- Primary: Social Networking
- Secondary: Lifestyle

## Age rating questionnaire — notes
Apple calculates the final rating from your answers to their questionnaire in App Store
Connect; it isn't something you set directly. Given HouseParty's actual features, expect
to answer "yes" to:
- **Unrestricted web access** — no (in-app browser only opens our own legal pages)
- **User-generated content** — yes (event listings, photos, reviews, messages)
- **Frequent/unmoderated user-to-user communication** — yes (booking messages between
  strangers, not pre-moderated)

These typically push the rating to **17+**. That's expected and normal for a
location-based social app that connects adult strangers — don't try to answer around it.

## App Privacy ("nutrition label") — data types to declare
Match these to what's actually collected (see `docs/index.html` for the full policy):

| Category | Data type | Linked to user? | Used for |
|---|---|---|---|
| Contact Info | Name, Email Address | Yes | App functionality, account |
| User Content | Photos, Other User Content (event listings, reviews, messages) | Yes | App functionality |
| Identifiers | User ID | Yes | App functionality |
| Location | Precise Location | Yes | App functionality (nearby events) |
| Sensitive Info | Government ID (verification photos) | Yes | App functionality (identity verification), not shared with third parties beyond storage |

Declare **no** tracking (no cross-app/cross-site tracking, no ad targeting) and **no**
data sold to third parties — matches the Privacy Policy.

## Screenshots
Apple's required device sizes change over time — App Store Connect will tell you exactly
which sizes it needs when you get to that step. At minimum you'll need screenshots for
the largest current iPhone display; the map, an event detail page, the create-event
wizard, and the Explore tab are good screens to feature.

## App icon
**Not ready yet** — currently the Expo default placeholder. Needs a real 1024x1024,
no-alpha-channel PNG before this listing can be submitted.

## Build number / versioning
`eas.json`'s `production` profile has `"autoIncrement": true`, so EAS bumps the iOS build
number automatically on each production build — no manual bookkeeping needed.
