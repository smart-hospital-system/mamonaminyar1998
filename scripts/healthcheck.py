"""File/SQLite/disk/backup watcher. Not a clinical alarm or a server-availability probe."""
import argparse
from pathlib import Path
import time
from backend.app.database import open_database
from backend.app import maintenance


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db',type=Path,required=True)
    parser.add_argument('--watch',action='store_true')
    args=parser.parse_args()
    if not args.db.is_file():
        parser.error('Database not found; no empty replacement is created.')
    engine,_=open_database(args.db.resolve())
    try:
        while True:
            result=maintenance.inspect(engine,Path(__file__).resolve().parents[1])
            print(time.strftime('%Y-%m-%d %H:%M:%S'),result['status'],flush=True)
            for alert in result['alerts']:
                print(alert['code'],alert['severity'],'ESCALATED' if alert['escalated'] else '',flush=True)
            if any(not a['acknowledged_at'] for a in result['alerts']):
                if __import__('os').name=='nt':
                    import winsound
                    winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
                else:
                    print('\a',end='',flush=True)
            if not args.watch:
                break
            time.sleep(maintenance.INTERVAL)
    except KeyboardInterrupt:
        pass
    finally:
        engine.dispose()


if __name__=='__main__':
    main()
