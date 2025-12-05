package com.cookshare.presentation.create

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

class CreateRecipeStepViewModel : ViewModel() {

    fun trackStepViewed(stepNumber: Int) {
        viewModelScope.launch {
            // Placeholder for analytics or persistence per step.
        }
    }
}
