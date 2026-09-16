from django.core.management.base import BaseCommand

from drt.services.clocks import backfill_negotiation_clocks


class Command(BaseCommand):
    help = (
        "Replay Archive history onto Negotiation case clocks. "
        "Dry-run by default; pass --commit to write."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--commit",
            action="store_true",
            help="Write proposed clocks. Without this flag, no rows are updated.",
        )

    def handle(self, *args, **options):
        write = bool(options["commit"])
        mode = "commit" if write else "dry-run"
        self.stdout.write(f"Backfill negotiation clocks ({mode})")

        stats = backfill_negotiation_clocks(write=write)

        self.stdout.write(f"  negotiations scanned: {stats['negotiations']}")
        self.stdout.write(
            f"  negotiations changed: {stats['negotiations_changed']}"
        )
        for field in (
            "submitted_at",
            "first_owner_open_at",
            "decided_at",
            "abandoned_at",
        ):
            counts = stats[field]
            self.stdout.write(
                f"  {field}: updated={counts['updated']} "
                f"already_set={counts['already_set']} "
                f"still_null={counts['still_null']}"
            )
        reopen = stats["reopen_count"]
        self.stdout.write(
            f"  reopen_count: updated={reopen['updated']} "
            f"already_set={reopen['already_set']} "
            f"unchanged_zero={reopen['unchanged_zero']}"
        )
        if write:
            self.stdout.write(self.style.SUCCESS("Committed clock backfill."))
        else:
            self.stdout.write(
                self.style.WARNING("Dry-run: no clocks were written. Pass --commit to apply.")
            )
