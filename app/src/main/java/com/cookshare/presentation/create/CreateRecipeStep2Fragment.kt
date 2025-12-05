package com.cookshare.presentation.create

import android.os.Bundle
import android.view.View
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.cookshare.R

class CreateRecipeStep2Fragment : Fragment(R.layout.fragment_create_recipe_step2) {

    private val viewModel: CreateRecipeStep2ViewModel by viewModels()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
    }
}
