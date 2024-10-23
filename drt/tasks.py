# # tasks.py
# import json
# from celery import shared_task
# from .models import SummaryStatistics

# @shared_task
# def export_summary_statistics():
#     """Export anonymized summary statistics to external storage."""
#     stats = SummaryStatistics.objects.all().values()
#     stats_data = json.dumps(list(stats), indent=2)

#     # Example: Push data to GitHub or DRT storage
#     with open('summary_statistics.json', 'w') as f:
#         f.write(stats_data)

#     # Here, you could upload the file to GitHub or any other storage.
#     print("Summary statistics exported successfully.")
