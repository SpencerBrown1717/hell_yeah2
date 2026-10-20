#!/usr/bin/env python3
"""Read the synthetic Excel contract with the standard library; never execute formulas."""
import copy
import datetime as dt
import json
import math
from pathlib import Path, PurePosixPath
import sys
import xml.etree.ElementTree as ET
import zipfile

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'


def import_workbook(path):
    path = Path(path)
    if path.stat().st_size > 20 * 1024 * 1024:
        raise ValueError('Workbook exceeds the 20 MiB fixture limit')
    template = json.loads((Path(__file__).resolve().parents[1] / 'fixtures/customer-learning/customers.json').read_text())
    with zipfile.ZipFile(path) as archive:
        if sum(i.file_size for i in archive.infolist()) > 50 * 1024 * 1024:
            raise ValueError('Expanded workbook exceeds 50 MiB')
        if len(archive.namelist()) != len(set(archive.namelist())):
            raise ValueError('Duplicate archive members are not allowed')
        workbook = ET.fromstring(archive.read('xl/workbook.xml'))
        properties = workbook.find('s:workbookPr', NS)
        if properties is not None and properties.get('date1904') in ('1', 'true'):
            raise ValueError('Use the supplied workbook with the 1900 date system')
        sheet = next((s for s in workbook.findall('s:sheets/s:sheet', NS) if s.get('name') == 'Customer Data'), None)
        if sheet is None:
            raise ValueError('Missing Customer Data worksheet')
        relationships = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        relation = next((r for r in relationships if r.get('Id') == sheet.get(f'{{{REL}}}id')), None)
        if relation is None or relation.get('TargetMode') == 'External':
            raise ValueError('Worksheet must be internal to the file')
        target = relation.get('Target', '')
        member = target.lstrip('/') if target.startswith('/') else 'xl/' + target
        if '..' in PurePosixPath(member).parts or not member.startswith('xl/'):
            raise ValueError('Invalid worksheet path')
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            shared = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            strings = [''.join(t.text or '' for t in e.findall('.//s:t', NS)) for e in shared.findall('s:si', NS)]
        root = ET.fromstring(archive.read(member))
        cells, formulas = {}, set()
        for cell in root.findall('s:sheetData/s:row/s:c', NS):
            ref = cell.get('r')
            if ref in cells:
                raise ValueError('Duplicate cell address')
            if cell.find('s:f', NS) is not None:
                formulas.add(ref)
            value, kind = cell.find('s:v', NS), cell.get('t')
            if kind == 's':
                parsed = strings[int(value.text)]
            elif kind == 'inlineStr':
                parsed = ''.join(t.text or '' for t in cell.findall('s:is//s:t', NS))
            elif kind in ('str', 'd', 'e'):
                parsed = value.text if value is not None else None
            elif value is None or value.text is None:
                parsed = None
            else:
                parsed = float(value.text)
            cells[ref] = parsed
    headers = {}
    for ref, value in cells.items():
        if ''.join(c for c in ref if c.isdigit()) == '6' and value:
            if value in headers:
                raise ValueError('Duplicate input column heading')
            headers[value] = ''.join(c for c in ref if c.isalpha())

    def read(row, name):
        if name not in headers:
            raise ValueError(f'Missing column: {name}')
        ref = f'{headers[name]}{row}'
        if ref in formulas:
            raise ValueError(f'{ref}: formulas are not accepted as imported raw evidence')
        return cells.get(ref)

    def num(row, name, nullable=False):
        value = read(row, name)
        if value is None and nullable:
            return None
        if not isinstance(value, (float, int)) or not math.isfinite(value):
            raise ValueError(f'Row {row}, {name}: finite number required')
        return value

    def text(row, name):
        value = read(row, name)
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f'Row {row}, {name}: text required')
        return value

    def yes(row, name):
        value = text(row, name)
        if value not in ('Yes', 'No'):
            raise ValueError(f'Row {row}, {name}: use Yes or No')
        return value == 'Yes'

    def check_date(row, name, expected):
        value = read(row, name)
        actual = ((dt.datetime(1899, 12, 30) + dt.timedelta(days=value)).isoformat()[:10]
                  if isinstance(value, (int, float)) else str(value)[:10])
        if actual != expected:
            raise ValueError(f'Row {row}, {name}: fixture date must remain {expected}')

    if cells.get('M111') != 0.55 or 'M111' in formulas:
        raise ValueError('This fixture requires the original 55% baseline margin in M111')
    originals = {c['customer_id']: c for c in template['customers']}
    result, seen = [], set()
    for row in range(7, 107):
        identity = text(row, 'Customer ID')
        if identity not in originals or identity in seen:
            raise ValueError(f'Row {row}: missing, unknown or duplicate synthetic customer ID')
        seen.add(identity)
        customer = copy.deepcopy(originals[identity])
        for column, expected in [('Observed date', '2026-10-18'), ('Period start', '2026-10-03'), ('Period end', '2026-10-17'), ('Initial period end', '2026-10-03')]:
            check_date(row, column, expected)
        for key, column in [('business_name', 'Fictional business'), ('email', 'Synthetic email'), ('industry', 'Industry'), ('scenario', 'Test scenario'), ('organization_id', 'Organization ID'), ('managed_account_id', 'Managed account'), ('marginal_certification', 'Marginal test case')]:
            customer[key] = text(row, column)
        if (not customer['business_name'].endswith('(Synthetic)') or not customer['email'].endswith('@example.com')
                or customer['organization_id'] != originals[identity]['organization_id']
                or customer['managed_account_id'] != originals[identity]['managed_account_id']
                or text(row, 'Channel') != 'Search'):
            raise ValueError(f'Row {row}: preserve synthetic identities and Search scope')
        for key, column in [('spend_usd', 'Ad spend USD'), ('net_revenue_usd', 'Net revenue USD'), ('eligible', 'Eligible outcomes'), ('qualified', 'Qualified outcomes'), ('current_budget_usd', 'Monthly budget USD'), ('wallet_available_usd', 'Wallet USD'), ('initial_spend_usd', 'Baseline spend USD'), ('initial_revenue_usd', 'Baseline revenue USD'), ('initial_eligible', 'Baseline eligible'), ('initial_qualified', 'Baseline qualified')]:
            customer[key] = num(row, column)
        for key, column in [('margin_bps', 'Gross margin'), ('fee_bps', 'Assumed fee')]:
            value = num(row, column, nullable=key == 'margin_bps')
            scaled = None if value is None else value * 10000
            if scaled is not None and abs(scaled - round(scaled)) > 1e-7:
                raise ValueError(f'Row {row}: rates must have whole basis-point precision')
            customer[key] = None if scaled is None else round(scaled)
        for key, column in [('mature', 'Outcomes mature?'), ('tracker_verified', 'Tracking verified?'), ('aggregate_opt_in', 'Contribute to cohort?')]:
            customer[key] = yes(row, column)
        if num(row, 'Mature conversions') != (customer['eligible'] if customer['mature'] else 0):
            raise ValueError(f'Row {row}: mature conversions must match maturity and eligible outcomes')
        for key, column in [('text', 'Customer feedback'), ('category', 'Feedback category'), ('polarity', 'Feedback polarity'), ('severity', 'Feedback severity')]:
            customer['feedback'][key] = text(row, column)
        result.append(customer)
    if cells.get('A107') is not None:
        raise ValueError('Expected exactly 100 customer rows; extra row found')
    template['customers'] = result
    return template


if __name__ == '__main__':
    try:
        if len(sys.argv) != 3:
            raise ValueError('Usage: python3 scripts/import-customer-workbook.py INPUT.xlsx OUTPUT.json')
        payload = import_workbook(sys.argv[1])
        Path(sys.argv[2]).write_text(json.dumps(payload, indent=2) + '\n')
        print('Imported 100 synthetic customer records')
    except (ValueError, OSError, KeyError, IndexError, ET.ParseError, zipfile.BadZipFile) as exc:
        print(f'Workbook import failed: {exc}', file=sys.stderr)
        sys.exit(1)
