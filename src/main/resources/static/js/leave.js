document.addEventListener('DOMContentLoaded', function() {
    
    // Auto calculate days between start and end date
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const numberOfDaysInput = document.getElementById('numberOfDays');

    if (startDateInput && endDateInput && numberOfDaysInput) {
        function calculateDays() {
            const start = new Date(startDateInput.value);
            const end = new Date(endDateInput.value);
            
            if (start && end && !isNaN(start) && !isNaN(end)) {
                if (end >= start) {
                    const diffTime = Math.abs(end - start);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
                    numberOfDaysInput.value = diffDays;
                } else {
                    numberOfDaysInput.value = 0;
                }
            }
        }

        startDateInput.addEventListener('change', calculateDays);
        endDateInput.addEventListener('change', calculateDays);
    }
});

function confirmAction(message, formId) {
    if (confirm(message)) {
        document.getElementById(formId).submit();
    }
}
