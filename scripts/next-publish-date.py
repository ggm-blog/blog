#!/usr/bin/env python3
"""Print the nth conventional publication date strictly after local today."""
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']


def next_date(today, weekday, n):
    delta = (weekday - today.weekday()) % 7 or 7
    return today + timedelta(days=delta + 7 * (n - 1))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--n', type=int, default=1, help='nth publication date (default: 1)')
    args = parser.parse_args()
    if args.n < 1:
        parser.error('--n must be a positive integer')
    # Read the deliberately small config without an external YAML dependency.
    # Accept comments and optional quotes around these scalar settings.
    text = (Path(__file__).resolve().parent.parent / '_publish.yml').read_text()
    settings = {}
    in_publish = False
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        if re.fullmatch(r'publish:\s*(?:#.*)?', line):
            in_publish = True
            continue
        match = re.fullmatch(r'\s+(weekday|timezone):\s*([^#]+?)(?:\s+#.*)?', line)
        if not in_publish or not match:
            parser.error('_publish.yml must contain publish.weekday and publish.timezone scalars')
        key, value = match.groups()
        if key in settings:
            parser.error(f'duplicate publish.{key}')
        settings[key] = value.strip().strip('\"\'')
    weekday = settings.get('weekday', '').lower()
    if weekday not in WEEKDAYS:
        parser.error('publish.weekday must be a weekday name')
    try:
        timezone = ZoneInfo(settings['timezone'])
    except (KeyError, ValueError, ZoneInfoNotFoundError) as error:
        parser.error(f'invalid publish.timezone: {error}')
    print(next_date(datetime.now(timezone).date(), WEEKDAYS.index(weekday), args.n).isoformat())


if __name__ == '__main__':
    main()
