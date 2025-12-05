package com.cookshare.presentation.create

import android.os.Bundle
import android.view.View
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.cookshare.R

class CreateRecipeStep1Fragment : Fragment(R.layout.fragment_create_recipe_step1) {

    private val viewModel: CreateRecipeStep1ViewModel by viewModels()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
    }
}
